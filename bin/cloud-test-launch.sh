#!/bin/bash
# Cloud GUI Testing — Launch macOS + Windows instances for build verification
# Prerequisites: aws sso login / ada credentials update for account 544277935543
# Cost: mac2.metal ~$26/day (24hr min), t3.large ~$2/day
set -e

REGION="${AWS_REGION:-us-east-1}"
KEY_NAME="${KEY_NAME:-osd-desktop-test}"
ACCOUNT="544277935543"

echo "=== OSD Desktop Cloud Testing Setup ==="
echo "Region: $REGION | Account: $ACCOUNT"
echo ""

# --- 1. Create key pair (if not exists) ---
aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" 2>/dev/null || \
  aws ec2 create-key-pair --key-name "$KEY_NAME" --region "$REGION" \
    --query 'KeyMaterial' --output text > "${KEY_NAME}.pem" && chmod 400 "${KEY_NAME}.pem"

# --- 2. Security group (SSH/RDP/VNC) ---
SG_ID=$(aws ec2 create-security-group \
  --group-name osd-desktop-test \
  --description "OSD Desktop GUI testing" \
  --region "$REGION" \
  --query 'GroupId' --output text 2>/dev/null || \
  aws ec2 describe-security-groups --group-names osd-desktop-test \
    --region "$REGION" --query 'SecurityGroups[0].GroupId' --output text)

aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --region "$REGION" \
  --ip-permissions \
    IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges='[{CidrIp=0.0.0.0/0,Description=SSH}]' \
    IpProtocol=tcp,FromPort=3389,ToPort=3389,IpRanges='[{CidrIp=0.0.0.0/0,Description=RDP}]' \
    IpProtocol=tcp,FromPort=5900,ToPort=5900,IpRanges='[{CidrIp=0.0.0.0/0,Description=VNC}]' \
  2>/dev/null || true

echo "Security Group: $SG_ID"

# --- 3. macOS arm64 (mac2.metal Dedicated Host) ---
echo ""
echo "=== macOS arm64 (mac2.metal) ==="
echo "Allocating Dedicated Host (24hr minimum)..."

MAC_HOST_ID=$(aws ec2 allocate-hosts \
  --instance-type mac2.metal \
  --availability-zone "${REGION}a" \
  --quantity 1 \
  --region "$REGION" \
  --query 'HostIds[0]' --output text)

echo "Dedicated Host: $MAC_HOST_ID"

# Find latest macOS Sonoma AMI for arm64
MAC_AMI=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=amzn-ec2-macos-14*" "Name=architecture,Values=arm64_mac" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --region "$REGION" --output text)

echo "AMI: $MAC_AMI"

MAC_INSTANCE_ID=$(aws ec2 run-instances \
  --instance-type mac2.metal \
  --image-id "$MAC_AMI" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --placement "HostId=$MAC_HOST_ID" \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=100,VolumeType=gp3}' \
  --region "$REGION" \
  --query 'Instances[0].InstanceId' --output text)

echo "macOS Instance: $MAC_INSTANCE_ID"

# --- 4. Windows (t3.large) ---
echo ""
echo "=== Windows (t3.large) ==="

WIN_AMI=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=Windows_Server-2022-English-Full-Base*" "Name=architecture,Values=x86_64" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --region "$REGION" --output text)

echo "AMI: $WIN_AMI"

WIN_INSTANCE_ID=$(aws ec2 run-instances \
  --instance-type t3.large \
  --image-id "$WIN_AMI" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=100,VolumeType=gp3}' \
  --region "$REGION" \
  --query 'Instances[0].InstanceId' --output text)

echo "Windows Instance: $WIN_INSTANCE_ID"

# --- 5. Wait and get IPs ---
echo ""
echo "Waiting for instances to start..."
aws ec2 wait instance-running --instance-ids "$MAC_INSTANCE_ID" "$WIN_INSTANCE_ID" --region "$REGION"

MAC_IP=$(aws ec2 describe-instances --instance-ids "$MAC_INSTANCE_ID" --region "$REGION" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
WIN_IP=$(aws ec2 describe-instances --instance-ids "$WIN_INSTANCE_ID" --region "$REGION" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo ""
echo "=== READY ==="
echo "macOS (arm64): ssh -i ${KEY_NAME}.pem ec2-user@${MAC_IP}"
echo "Windows (x64): RDP to ${WIN_IP} (get password: aws ec2 get-password-data --instance-id $WIN_INSTANCE_ID)"
echo ""
echo "=== NEXT STEPS ==="
echo "On each instance, run: bin/setup-test-instance.sh"
echo ""
echo "=== CLEANUP (run when done) ==="
echo "aws ec2 terminate-instances --instance-ids $MAC_INSTANCE_ID $WIN_INSTANCE_ID --region $REGION"
echo "aws ec2 release-hosts --host-ids $MAC_HOST_ID --region $REGION  # after 24hr minimum"
