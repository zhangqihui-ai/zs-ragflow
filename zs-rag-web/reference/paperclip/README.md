# Paperclip UI 源码参考

本机参考快照位于 `snapshot/ui/`，基于 [Paperclip 提交 1a6017d](https://github.com/paperclipai/paperclip/tree/1a6017d6460267ad89d7e1784e2b521c28d8e9ac/ui)，与用于参考的本机检出版本一致。快照保留了上游许可证和完整的 `ui/`，由 Git 忽略。应用仍从 `zs-rag-web/src/` 构建。Paperclip UI 引用了上游 monorepo 的共享包、插件 SDK 和 API，迁移时参照页面结构和交互，功能仍接现有 RAGFlow Go API。

在仓库根目录执行以下命令可以从已有 Paperclip 检出重建同一版本的快照。

```bash
mkdir -p zs-rag-web/reference/paperclip/snapshot
git -C /root/github/paperclip archive 1a6017d6460267ad89d7e1784e2b521c28d8e9ac LICENSE ui |
  tar -xf - -C zs-rag-web/reference/paperclip/snapshot
```

先看 `ui/src/components/Sidebar.tsx`、`ui/src/components/Layout.tsx`、`ui/src/pages/Dashboard.tsx` 和 `ui/src/index.css`。逐菜单交付顺序见 [迁移计划](../../MIGRATION_PLAN.md)。
