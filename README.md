# Web万年時計

田中久重「万年自鳴鐘」(1851) に着想を得た Web ガジェット。

## 構成

| コンポーネント | 内容 |
|---|---|
| `SkyBar.vue` | 天象バー — 天気・太陽・月・ホバー予報・日出日没時刻 |
| `EtoBar.vue` | 和時刻バー — 干支・不定時法・刻限数 |
| `WarekiCalendar.vue` | 和暦カレンダー — 旧暦・六曜・二十四節気・節句・雑節・祝日 |
| `ThemeToggle.vue` | ライト／ダークテーマ切替トグル（`localStorage` で永続化） |
| `MiniGadget.vue` | 小ガジェット — 現在時刻・和時刻干支のウィジェット風表示 |
| `MedGadget.vue` | 中ガジェット — 日付・現在時刻・天気・気温・降水量・風速・和時刻干支のウィジェット風表示 |

## 使用 API

| API | 用途 |
|---|---|
| [Open-Meteo](https://open-meteo.com/) | 天気予報・気温・降水量・日出日没時刻（無料・認証不要） |
| [Nominatim](https://nominatim.openstreetmap.org/) | 逆ジオコーディング — 緯度経度から地名取得（OpenStreetMap、無料・認証不要） |

旧暦・二十四節気・月齢・雑節はすべて **外部 API 不使用・天文略算式のみ**で計算。

> **Nominatim 利用規約**: リクエストには `User-Agent` ヘッダーの付与が必要です。
> 大量リクエストは禁止されており、本アプリは位置情報取得時に1回のみ呼び出します。

## wa-datetime

本アプリは暦・和時刻の計算に **wa-datetime**（自作 TypeScript ライブラリ）を使用しています。

### 機能

| モジュール | 内容 |
|---|---|
| `core/jd.ts` | ユリウス日 ↔ グレゴリオ暦変換（JST 補正済み） |
| `core/sun.ts` | 太陽黄経・二十四節気 JD（二分法による精密計算） |
| `core/moon.ts` | 合朔 JD・月齢・月相名 |
| `lunar/convert.ts` | 旧暦変換・中国暦との差分計算（キャッシュ付き） |
| `lunar/names.ts` | 月名・日漢字・六曜・節句・雑節 |
| `sekki/index.ts` | 二十四節気（節入り時刻付き） |
| `koku/index.ts` | 和時刻不定時法（日出日没基準の可変刻） |
| `kanshi/index.ts` | 十干十二支・陰陽五行・納音・日干支・月干支（節入り基準） |

### 精度

- 二十四節気は国立天文台暦要項と日付一致（時刻差 15 分以内）
- 六曜・日干支・月干支は ajnet カレンダー等と全一致確認済み
- 月干支は節入り基準（中国・日本の伝統的計算法に準拠）

### ビルド

```bash
cd wa-datetime
npm install
npm run build   # dist/ に ESM + CJS のデュアル出力
npm test        # vitest（89 テスト）
```

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
   例: `base: '/mannen-clock/'`
2. GitHub リポジトリの Settings → Pages → Source を **GitHub Actions** に設定
3. `main` ブランチへ push すると `deploy.yml` が自動実行（pnpm でインストール・ビルド）

### GitLab Pages

1. `main` ブランチへ push すると `.gitlab-ci.yml` が自動実行
2. `public/` が GitLab Pages として公開される

## コンポーネントの移植

各 Vue ファイルは **相互依存なし**で設計されており、必要なガジェットだけを他プロジェクトに移植できます。

### 移植に必要なファイル

| ファイル | 役割 | 必須 |
|---|---|---|
| `src/composables/useSkyData.ts` | 位置情報・天気・日出日没の取得（シングルトン） | 全コンポーネント共通 |
| `src/components/SkyBar.vue` | 天象バー | 個別 |
| `src/components/EtoBar.vue` | 和時刻バー | 個別 |
| `src/components/MiniGadget.vue` | 小ガジェット | 個別 |
| `src/components/MedGadget.vue` | 中ガジェット | 個別 |
| `src/components/WarekiCalendar.vue` | 和暦カレンダー | 個別 |
| `vendor/wa-datetime-*.tgz` | 暦・和時刻計算ライブラリ | 全コンポーネント共通 |

### useSkyData の動作

`useSkyData.ts` はシングルトンパターンで実装されており、複数のコンポーネントが同時に使用しても API へのアクセスは共有されます。

```
初回マウント時
  → Geolocation 取得
  → Nominatim 逆ジオコーディング（地名取得）
  → Open-Meteo API（天気・日出日没）
  → sky ref に結果を格納

以降 10 分ごと
  → Open-Meteo API のみ再取得
  → sky ref 更新 → 参照中の全コンポーネントが自動再描画
```

複数のコンポーネントを同一ページに配置しても、Open-Meteo へのアクセスは **10 分に 1 回**だけです。

### 最小移植例（小ガジェットのみ）

```vue
<script setup lang="ts">
import MiniGadget from './components/MiniGadget.vue'
</script>

<template>
  <MiniGadget />
</template>
```

`useSkyData.ts` と `wa-datetime` を依存関係に加えるだけで動作します。

## ライセンス

GNU General Public License v3.0
