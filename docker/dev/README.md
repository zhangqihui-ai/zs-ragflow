### Docker 开发模式

先安装 `uv` 和 Git，在项目根目录准备本机依赖，再启动（Docker Compose v2）：

```bash
bash docker/dev/prepare.sh
docker compose -f docker-compose-dev.yml up --build
```

`prepare.sh` 按 `README_zh.md` 调用两个现有下载脚本，并额外下载分词字典：

```bash
uv run tools/scripts/download_dev_deps.py --target-os linux --target-arch amd64
uv run deps/download_deps.py
git clone --depth 1 https://github.com/infiniflow/resource.git deps/infinity-resource
```

上面的手动命令以 amd64 为例；准备脚本默认按宿主机架构选择，容器架构不同时设置
`RAGFLOW_TARGET_ARCH=amd64` 或 `arm64`。即使宿主机是 macOS，也要下载 Linux 原生库。
已有完整依赖可以跳过准备步骤。下载脚本会复用已有资源；国内镜像参数可通过
`bash docker/dev/prepare.sh --china-mirrors` 传入下载脚本，分词字典仍从 GitHub 克隆。

本机资源的挂载关系：

| 本机路径 | 容器内用途 |
| --- | --- |
| `~/ragflow-native-libs` | 只读挂载到 `/opt/ragflow-native-libs`，启动时复制到容器编译缓存供 `build.sh` 链接 |
| `internal/rag/res/deepdoc` | 通过源码挂载提供 DeepDoc `.ort` 模型及 `ocr.res` |
| `deps/cl100k_base.tiktoken`、`deps/huggingface.co` | 通过源码挂载提供词表和 embedding 分词器 |
| `deps/infinity-resource` | 挂载到 `/usr/share/infinity/resource`，提供 `rag`、`opencc`、`wordnet` 字典 |
| `deps/NotoSansCJKsc-VF.ttf` | 挂载到 PDF 生成器查找的字体路径 |

原生库放在其他目录时设置 `RAGFLOW_NATIVE_LIBS_DIR=/绝对路径`。该目录必须包含与
当前源码版本匹配的 `office_oxide`、`pdfium-static`、`pdf_oxide` 和 `onnxruntime` 子目录。

前端就绪、后端日志出现 `Go services restarted` 后，可访问两套前端。

| 前端 | 源码目录 | 默认地址 |
| --- | --- | --- |
| 原版 `frontend` | `web/` | [http://localhost:9222](http://localhost:9222) |
| 新版 `frontend-new` | `zs-rag-web/` | [http://localhost:9223](http://localhost:9223) |

远程服务器开发时，把 localhost 换成服务器 IP。API 和 Admin 分别暴露在 9380、9381 端口。
新版首页默认展示标记为「演示数据」的示例。用同一主机名访问两套前端，在原版登录后刷新新版即可查看工作区数据。
新版的功能菜单打开原版对应页面。原版前端使用独立域名时，可设置 `VITE_LEGACY_WEB_ORIGIN` 指向其地址。
首次安装前端依赖时容器已运行，但对应端口尚未监听，访问会被拒绝。
用 `docker compose -f docker-compose-dev.yml ps` 查看前端健康状态，`healthy` 表示页面已可访问。

首次启动需要拉取构建镜像和中间件镜像，安装 npm/Go 依赖，编译原生库及
Go 服务，耗时较长。Docker 建议分配至少 8 核、16 GB 内存，并预留足够镜像和模型存储空间。
Linux 宿主机若 Elasticsearch 提示 `vm.max_map_count` 太小，执行
`sudo sysctl -w vm.max_map_count=262144` 后重启服务。

源码目录以读写方式挂载，允许 Docker 创建 `.cache`、`logs`、`node_modules` 等命名卷的
挂载点；这些目录的内容写入开发命名卷。模型、`deps`、字典、字体和下载的原生库单独只读挂载。
更新本机原生库或运行资源后，重新创建后端容器以重新加载。
React/TypeScript 保存后由 Vite 热更新；Go/C++、配置及模板保存后自动增量编译并重启
API、Admin、Ingestor、Syncer。后端编译期间原服务继续运行，编译错误输出在终端，修正保存后重试。
后端编译和重启需要时间，重启期间浏览器请求可能短暂失败，日志就绪后重试即可。
任一前端的 `package-lock.json` 更新后，重启对应的容器以重新安装依赖。
修改 `docker/dev/Dockerfile` 后需要再次执行 `up --build`。

后端只使用 `infiniflow/github_action_runner:latest` 提供 Go/C++ 编译工具，资源来自本机。
中间件版本与 `docker/docker-compose-base.yml` 保持一致。
默认编译镜像适用于 amd64。ARM64 主机启动时设置
`RAGFLOW_BUILD_IMAGE=infiniflow/github_action_runner:latest-arm64`，与生产构建选择一致。

默认仅启动基础中间件 MySQL、Elasticsearch、MinIO、Kvrocks 和 NATS JetStream，
等待健康检查通过后再启动后端，NATS 的 JetStream 就绪检查在后端启动脚本中完成；
数据卷使用 `ragflow-dev` 项目前缀。
与现有 Compose 的默认 profiles 对齐，不启动 ClickHouse、Jaeger、Kibana、TEI、
沙箱及其他文档引擎。当前开源 Go 后端不建立 ClickHouse 连接，基础开发无需该服务。
开发配置位于 `docker/dev/service_conf.yaml`，固定凭据仅用于开发，
Admin 初始密码为 `admin`。中间件无需在宿主机安装，也无需读取 `docker/.env`。
聊天、向量化和重排模型需要在页面中配置可用的模型服务；此配置不会自动下载或运行 LLM。
容器访问宿主机模型服务可以使用 `host.docker.internal`。

常用命令：

```bash
# 后台启动
docker compose -f docker-compose-dev.yml up --build -d
# 查看热加载、编译和启动日志
docker compose -f docker-compose-dev.yml logs -f backend frontend frontend-new
# 停止，保留数据和依赖缓存
docker compose -f docker-compose-dev.yml down
# 前端依赖变更后重新安装并启动
docker compose -f docker-compose-dev.yml restart frontend
```

端口被占用时可在命令前设置 `DEV_WEB_PORT`、`DEV_NEW_WEB_PORT`、`DEV_API_PORT`、`DEV_ADMIN_PORT`、
`DEV_MINIO_CONSOLE_PORT`，例如 `DEV_NEW_WEB_PORT=9224 docker compose -f docker-compose-dev.yml up --build`。
`down -v` 会删除所有开发数据和缓存，仅在需要重置环境时使用。
