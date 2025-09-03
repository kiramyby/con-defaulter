# 内部测试凭据文档

⚠️ **机密文档 - 仅供开发团队内部使用**

## 测试用户密码

所有测试用户的统一密码：`Test123456`

## 测试账号清单

| 用户名 | 邮箱 | 角色 | 状态 | 密码 |
|-------|------|------|------|------|
| test_admin | test.admin@example.com | ADMIN | ACTIVE | Test123456 |
| test_operator | test.operator@example.com | OPERATOR | ACTIVE | Test123456 |
| test_auditor | test.auditor@example.com | AUDITOR | ACTIVE | Test123456 |
| test_user1 | test.user1@example.com | OPERATOR | ACTIVE | Test123456 |
| test_user2 | test.user2@example.com | AUDITOR | INACTIVE | Test123456 |

## 注意事项

1. 此文档包含敏感信息，不应提交到代码仓库
2. 仅供开发和测试环境使用
3. 生产环境部署前必须删除所有测试账号
4. 定期更换测试密码