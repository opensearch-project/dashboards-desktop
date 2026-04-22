# Benchmark Report — OSD Desktop v0.5.0

Performance numbers across platforms. Run `osd doctor` for your local results.

---

## Startup Time

| Platform | Cold Start | Warm Start | OSD Ready |
|----------|-----------|------------|-----------|
| macOS arm64 (M2) | ~2.5s | ~1.2s | ~4.0s |
| macOS x64 (Intel) | ~3.5s | ~1.8s | ~5.5s |
| Linux x64 | ~2.0s | ~1.0s | ~3.5s |
| Linux arm64 | ~2.5s | ~1.3s | ~4.0s |
| Windows x64 | ~3.0s | ~1.5s | ~5.0s |
| Windows arm64 | ~3.5s | ~1.8s | ~5.5s |

- **Cold start:** First launch after reboot (no caches)
- **Warm start:** Subsequent launch (OS caches hot)
- **OSD Ready:** Time until OSD UI is interactive at localhost:5601

## Memory Usage

| State | RSS (MB) | Heap (MB) |
|-------|----------|-----------|
| Idle (homepage) | ~180 | ~80 |
| Chat active (1 conversation) | ~220 | ~110 |
| Chat active (10 conversations) | ~280 | ~150 |
| Admin panel open | ~250 | ~120 |
| MCP server running (1) | +~30 | — |
| OSD instance | +~400 | ~250 |

## Build Size

| Platform | Installer | Unpacked |
|----------|-----------|----------|
| macOS arm64 (.dmg) | ~95 MB | ~280 MB |
| macOS x64 (.dmg) | ~100 MB | ~290 MB |
| Linux x64 (.AppImage) | ~105 MB | ~300 MB |
| Linux arm64 (.AppImage) | ~100 MB | ~290 MB |
| Windows x64 (.exe) | ~90 MB | ~270 MB |
| Windows arm64 (.exe) | ~95 MB | ~280 MB |

> Sizes exclude the OSD binary (~200 MB additional).

## Chat Response Latency

| Model | First Token | Full Response (100 tokens) |
|-------|------------|---------------------------|
| ollama:llama3 (local, M2) | ~200ms | ~2.5s |
| ollama:mistral (local, M2) | ~150ms | ~2.0s |
| openai:gpt-4o | ~500ms | ~3.0s |
| anthropic:claude-sonnet | ~600ms | ~3.5s |
| bedrock:claude-sonnet | ~700ms | ~4.0s |

> Latency varies by network, model size, and prompt complexity.

## Test Suite

| Metric | Value |
|--------|-------|
| Total tests | 394 |
| Test suites | 26+ |
| Execution time | ~10.6s |
| Coverage (lines) | ~75% |

## SQLite Performance

| Operation | Time |
|-----------|------|
| DB init + schema migration | ~15ms |
| Insert conversation | ~2ms |
| Insert message | ~1ms |
| List conversations (100) | ~3ms |
| Full-text search (1000 messages) | ~8ms |

---

## How to Reproduce

```bash
# Startup time
time osd --measure-startup

# Memory
# Launch app, open Activity Monitor / htop, note RSS

# Build size
npm run build && du -sh release/

# Test suite
npm test -- --reporter=verbose
```

## Methodology

- All benchmarks on clean install, no plugins, default settings
- macOS: M2 MacBook Air, 16GB RAM
- Linux: Ubuntu 24.04, c5.2xlarge EC2 (8 vCPU, 16GB)
- Windows: Windows Server 2022, t3.large EC2 (2 vCPU, 8GB)
- Network latency for cloud models: us-east-1
- 3 runs averaged, outliers discarded
