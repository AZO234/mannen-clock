# Web 万年時計

田中久重「万年自鳴鐘」(1851) に着想を得た Web ガジェット。

## 構成

| コンポーネント | 内容 |
|---|---|
| `SkyBar.vue` | 空バー — 天気・太陽・月・ホバー予報 |
| `EtoBar.vue` | 和時刻バー — 干支・不定時法・刻限数 |
| `WarekiCalendar.vue` | 和暦カレンダー — 旧暦・六曜・二十四節気・節句・雑節・祝日 |

## 使用 API

| API | 用途 |
|---|---|
| [Open-Meteo](https://open-meteo.com/) | 天気予報・気温・降水量（無料・認証不要） |

旧暦・二十四節気・月齢・雑節はすべて **外部 API 不使用・天文略算式のみ**で計算。

## セットアップ

```bash
pnpm install
pnpm run dev       # 開発サーバー起動
pnpm run build     # プロダクションビルド
pnpm run preview   # ビルド確認
```

## デプロイ

### GitHub Pages

1. `vite.config.ts` の `base` をリポジトリ名に合わせる  
   例: `base: '/mannen-dokei/'`
2. GitHub リポジトリの Settings → Pages → Source を **GitHub Actions** に設定
3. `main` ブランチへ push すると `deploy.yml` が自動実行（pnpm でインストール・ビルド）

### GitLab Pages

1. `main` ブランチへ push すると `.gitlab-ci.yml` が自動実行
2. `public/` が GitLab Pages として公開される

## ライセンス

GNU General Public License v3.0
