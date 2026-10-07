# Shoot-Killer（快门杀）

横屏拍照淘汰。每人登记一张正脸，之后拍到场上还活着的人，就用你自己的接口按 **OpenAI Responses** 格式比对。对上立刻淘汰，没有裁判，也不在本机跑识别模型。

## 环境

- Node.js 22 或更高
- 一个支持 `POST /v1/responses`、并且能看图的模型（OpenAI 官方，或兼容这套格式的网关）

## 运行

```bash
git clone https://github.com/GoogleEdge/Shoot-Killer.git
cd Shoot-Killer
npm install
npm run dev
```

浏览器打开 [http://localhost:8080](http://localhost:8080)。请用横屏。手机竖着时会提示转过来。

## 怎么玩

1. 在入场页填写 **Base URL**、**模型**、**API Key**。默认地址是 `https://api.openai.com/v1`，模型可以选 `gpt-4.1-mini`、`gpt-4.1`、`gpt-4o-mini`、`gpt-4o`，也可以手写别的模型名。
2. 输入名字，选焰组或钢组，拍一张正脸，登记进场。
3. 对准对手按「识别并开枪」。服务器把新照片和还活着的登记照一起发给 `{Base URL}/responses`。
4. 对上了，名字马上出现在淘汰榜。没对上只记一枪，人不出局。

Key 只存在这台浏览器里，开枪时才随请求提交，不会写进对局数据库。

同一张登记照（字节完全一致）会直接锁定，不调用接口。演示页「拍到周予」走的就是这条。

## 页面

| 路径 | 作用 |
| --- | --- |
| `/` | 横屏战场 |
| `/board` | 淘汰榜 |
| `/demo` | 演示：注入一局，拍同一张登记照或拍路人 |

演示里的「拍到路人」会真的打你的接口。没填 Key 时会提示先填写。

## 接口格式

请求是 OpenAI Responses，不是 Chat Completions：

```http
POST {Base URL}/responses
Authorization: Bearer {API Key}
Content-Type: application/json
```

```json
{
  "model": "gpt-4.1-mini",
  "input": [
    {
      "role": "user",
      "content": [
        { "type": "input_text", "text": "…" },
        { "type": "input_image", "image_url": "data:image/jpeg;base64,…", "detail": "low" }
      ]
    }
  ]
}
```

只填域名（例如 `https://api.openai.com`）时会自动补上 `/v1/responses`。已经写到 `/v1` 或 `/responses` 也可以。

模型需要返回 JSON：`matched`、`name`（必须是场上的名字）、`confidence`（0 到 1）、`note`。置信度低于 0.55，或名字不在场上，都不会淘汰。

## 数据

不设置 `DATABASE_URL` 时，用内嵌的 Postgres（PGLite），数据跟这次进程走。要多人长期共享同一局，设置 Postgres 连接串 `DATABASE_URL` 后再启动。

不需要账号。对局数据没有用户隔离。

## 常用命令

```bash
npm run dev        # 开发，0.0.0.0:8080
npm run typecheck
npm run build
npm run preview    # 构建结果，127.0.0.1:8081
```
