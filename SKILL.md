---
name: cursor-agent
version: 1.0.0
description: "调用 Cursor 编码代理执行代码评审和 TDD 实现。支持文档/代码 review、根据实现计划 review、以及 TDD 方式实现功能。当用户说'帮我 review'、'评审'、'让 cursor 实现'、'写测试'等时触发。"
metadata:
  requires:
    env: ["CURSOR_API_KEY"]
---

# cursor-agent

## 触发条件

用户说以下类型的话时，使用本 skill：

- "帮我 review 一下这个文档"
- "评审一下 src/auth.ts"
- "根据 docs/plan.md 评审代码实现"
- "让 cursor 实现登录功能"
- "给这个模块加单元测试"
- "检查一下这段代码"

## 执行方式

```bash
# Review 单个文件
cursor-agent review <file>

# Review 并保存结果
cursor-agent review <file> --output result.md

# 根据实现计划 review 代码
cursor-agent review --plan docs/plan.md

# 实现功能（TDD）
cursor-agent implement "给 auth.ts 加 JWT 验证"

# 实现并指定输出文件
cursor-agent implement "添加用户管理模块" --output src/user.ts

# 详细输出
cursor-agent review src/auth.ts --verbose
```

## 配置

需要设置环境变量：

```bash
export CURSOR_API_KEY="crsr_..."  # 从 https://cursor.com/dashboard/integrations 获取
export CURSOR_MODEL="composer-3"  # 可选，默认 auto
```

或创建配置文件 `~/.cursor-skill/settings.json`：

```json
{
  "cursorApiKey": "crsr_...",
  "defaultModel": "composer-3"
}
```

## 能力边界

- **支持**：单文件 review、plan-based review、代码实现（TDD）
- **模式**：本地模式（在当前工作目录执行）
- **输出**：默认简洁模式，--verbose 显示详细过程
