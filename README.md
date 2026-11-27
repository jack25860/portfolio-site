# Portfolio Site

個人作品展示網站：專業技能、興趣、生活、旅行與開發成果，附一個由站長輸入密碼後更新內容的後台。

## 結構

```
index.html            前台（單頁，六個區塊）
content.json          所有內容資料（前台與後台共用）
assets/tokens.css     設計權杖（色彩／字階／間距／動態）
assets/site.css       前台樣式
assets/app.js         前台渲染與互動
assets/seed.js        content.json 的備援副本（發布時自動重生）
admin/index.html      後台：登入 + 內容編輯器
admin/admin.css       後台樣式
admin/admin.js        登入驗證、編輯器、GitHub 發布
```

## 後台

網址：`/admin/`　預設密碼：`portfolio2026`

後台是**靜態頁面**，登入只是前端閘門（用來阻擋一般訪客誤入），真正的寫入權限由 GitHub Token 控制。
在「發布」頁填入 Fine-grained Personal Access Token（權限：**Contents: Read and write**），
按「發布到 GitHub」即會把 `content.json` 與 `assets/seed.js` 寫回這個 repo，GitHub Pages 約一分鐘後生效。

Token 只存在該台裝置的瀏覽器 localStorage，不會傳到任何第三方。

## 內容

所有文字、圖片網址、影片、連結與動畫區塊都在 `content.json`。
圖片目前使用 Wikimedia Commons 的公開網址；要換成自己的照片，把 `content.json` 裡的網址改成
`images/your-photo.webp` 並把檔案放進 `images/` 即可，不需要改任何 CSS。

## 設計

依 Editorial Technical 規範：Paper `#F5F2EB` / Ink `#12151A` / Clay `#C94F2B`，
Fraunces + IBM Plex Sans + IBM Plex Mono，4px 間距基準，圓角上限 4px，動效只動 transform 與 opacity。
支援深色模式與 `prefers-reduced-motion`。
