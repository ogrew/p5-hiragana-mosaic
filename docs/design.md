# design.md

## 1. 目的

本ドキュメントは、`requirements.md` で定義された「ひらがなASCIIアート画像フィルター」を **p5.js + Tweakpane** で実装するための技術設計（アーキテクチャ / データフロー / 主要アルゴリズム / モジュール構成 / UIイベント設計 / パフォーマンス方針 / デプロイ方針）を定める。

本プロジェクトは将来的に **GitHub Pages** で公開するため、静的ホスティングで動作する設計とする。

---

## 2. 技術スタック

- 描画: p5.js（2D / Canvas）
- UI: Tweakpane
- フォント: Google Fonts（earlyaccess 含む）
- 実行形態: 静的HTML（ローカル静的サーバ / GitHub Pages）
- 画像入力:
  - 同梱サンプル画像（URLロード）
  - ローカル画像（File inputで読み込み、ブラウザ内で処理）

---

## 3. 全体アーキテクチャ

### 3.1 コンポーネント概要

- **ImageManager**
  - サンプル画像リスト管理（同梱画像のURL）
  - ローカル画像の読み込み（`<input type="file">`）
  - p5.Imageへの変換、表示サイズ（fit to viewport）計算
- **FontManager**
  - UIで選択されたフォントを「Load Font」ボタンで読み込み・適用
  - `document.fonts.load()` を利用して読み込み完了を待つ
- **CharsetManager**
  - `charset`（ひらがな文字列）とモード（auto / manual）の管理
  - auto時は **DensityAnalyzer** を使って密度ソート結果を生成・キャッシュ
  - 入力は日本語（ひらがな/カタカナ/漢字）+ 空白に限定（非日本語は除外）
- **DensityAnalyzer**
  - オフスクリーンで各文字の「密度」を計測し、暗→明の順に並べ替え
- **Renderer**
  - 画像を縮小して `imgSmall(cols × rows)` を作成（1ピクセル=1セル）
  - 各セルで代表色（RGB）と明度（luma）を取り、文字を選択・描画
  - overlay/textOnly の描画モードに対応
  - 透明セル（alphaしきい値未満）では描画しない
  - 画像領域クリップを適用して「はみ出し」を見せない
- **UIController**
  - Tweakpane の初期化
  - 変更イベントで `requestRedraw()` を発行（`noLoop()` + `redraw()`）

---

## 4. ディレクトリ / ファイル構成案（GitHub Pages対応）

GitHub Pages（リポジトリ配下パス）でも壊れにくいよう、静的配信に寄せる。

```
/docs or /public (Pagesの設定に合わせる)
  index.html
  /assets
    /samples
      sample_01.jpg
      sample_02.png
      ...
  /scripts
    generate_manifest.py
  /serve
  /src
    main.js
    ui.js
    renderer.js
    image_manager.js
    font_manager.js
    charset_manager.js
    density.js
    util.js
```

- Pagesの「ルート」公開か「/docs」公開かは後で決める（どちらでも成立するよう相対パスを基本とする）
- サンプル画像は `assets/samples/` に配置し、相対パスで参照する

---

## 5. キーとなる設計判断

### 5.1 グリッド設計（cols固定、隙間なし）

- `cols` はユーザー指定（Tweakpane）
- `cellW = displayW / cols`
- `cellH = cellW`（※ `cellAspect` は **常に1.0固定**）
- `rows = ceil(displayH / cellH)`  
  → 縦方向の隙間は発生しない（最後の行がはみ出す可能性はある）
- はみ出しは「描かない」ではなく、**画像領域でクリップ**して見せない

### 5.2 セル平均色（相当）の取得

厳密平均は行わず、縮小画像を使って高速に近似する。

- `imgSmall = img.get(); imgSmall.resize(cols, rows);`
- `imgSmall(x, y)` の RGBA を、そのセルの代表色とする  
  → 1ピクセル=1セル

### 5.3 透明セルの扱い

- `alpha < alphaThreshold` のセルは **描画しない**

### 5.4 ひらがな文字の密度ソート（デフォルト）

- `charsetMode = autoDensitySort` をデフォルト
- `DensityAnalyzer` が `charset` の各文字について密度を計測し、密度降順でソートして「暗→明の順」を作る
- `charsetMode = manual` の場合はユーザー指定順序をそのまま使う

### 5.5 明暗反転（invert）

- `invert=false`: 暗いほど密な文字（通常）
- `invert=true`: 文字割当の方向を逆にする（実装は index計算の反転 or charset reverse）

### 5.6 インタラクティブ更新

- p5 は `noLoop()` で常時描画を止める
- UI/画像/フォントイベントでのみ `requestRedraw()` を呼び、1フレームだけ描画する

---

## 6. 画像入力設計（サンプル + ローカル）

### 6.1 サンプル画像

- `assets/samples/manifest.json` などに一覧を置く案もあるが、初期は `image_manager.js` に配列で持って良い
- UIで選択されたサンプルを `loadImage(sampleUrl, onLoad)` で読み込む
- 読み込み完了後に `requestRedraw()`

### 6.2 ローカル画像（File input）

- `index.html` に `<input type="file" accept="image/*">` を配置（Tweakpane外でも可）
- 選択された `File` を `URL.createObjectURL(file)` でURL化し、p5の `loadImage(objectUrl, ...)` で読み込む
- 読み込み完了後に `URL.revokeObjectURL(objectUrl)`（不要になったら解放）
- ローカル画像はブラウザ内でのみ扱い、外部送信はしない

※ 代替として `FileReader.readAsDataURL()` でも可能だが、objectURLの方が軽い。

---

## 7. レンダリング・パイプライン詳細

### 7.1 座標系 / レイアウト

#### 7.1.1 キャンバスサイズ
- 原則: 画像をビューポートにフィットさせたサイズでキャンバスを作る
  - `maxW = windowWidth - uiPanelWidth - margin`
  - `maxH = windowHeight - margin`
  - 画像アスペクト比を維持して `displayW, displayH` を決定
- キャンバスは `displayW × displayH`
- UIパネルはDOM側（Tweakpane）で別領域に置く

#### 7.1.2 画像領域
- `imgX=0, imgY=0, imgW=displayW, imgH=displayH` を基本とする

### 7.2 描画順序

`renderMode` によって分岐:

- **overlay**
  1. 背景をクリア
  2. `tint(255, imageAlpha)` を設定し、元画像を描画
  3. 画像領域をクリップし、文字を描画
- **textOnly**
  1. 背景を `backgroundColor` で塗りつぶし
  2. 画像領域をクリップし、文字を描画

### 7.3 クリッピング（はみ出し対策）

Canvas 2D Context でクリップする。

- `drawingContext.save()`
- `drawingContext.beginPath(); drawingContext.rect(imgX, imgY, imgW, imgH); drawingContext.clip();`
- 文字描画
- `drawingContext.restore()`

### 7.4 セル走査と文字描画（アルゴリズム）

#### 7.4.1 前処理: imgSmall の作成
- `imgSmall = img.get()`
- `imgSmall.resize(cols, rows)`
- `imgSmall.loadPixels()`

#### 7.4.2 セルループ
- `for cy in [0..rows-1]`
- `for cx in [0..cols-1]`

各セルで:

1) 代表RGBA取得（imgSmallから）
- `r,g,b,a = samplePixel(imgSmall, cx, cy)`
- `if a < alphaThreshold: continue`

2) 明度計算
- `luma = 0.2126*r + 0.7152*g + 0.0722*b`（0..255）
- `t = (luma/255)`
- `tGamma = pow(t, gamma)`

3) 文字インデックス計算
- `if invert: tGamma = 1 - tGamma`
- `idx = floor(tGamma * (charsetLen - 1))`
- clampで範囲外を潰す

4) 描画位置（letterSpacing対応）
- `cellW = imgW / cols`, `cellH = cellW`
- `stepX = cellW * letterSpacing`
- `stepY = cellH * letterSpacing`
- `gridW = cols * stepX`, `gridH = rows * stepY`
- `originX = imgX + (imgW - gridW)/2`
- `originY = imgY + (imgH - gridH)/2`
- `x = originX + (cx + 0.5) * stepX`
- `y = originY + (cy + 0.5) * stepY`

5) jitter（位置ゆらぎ）
- 連続redrawでブレないように seed固定の決定的乱数にする
  - `randomSeed(seed)` の上でセル順に `random()` を呼ぶ
- `x += random(-jitter, jitter)`, `y += random(-jitter, jitter)`

6) 文字サイズ
- `textSize = cellW * textScale`（例: 0.9）
- `textAlign(CENTER, CENTER)`

7) 文字色
- `fill(r, g, b, textAlpha)`
- `noStroke()`

---

## 8. 文字密度計測（DensityAnalyzer）

### 8.1 目的

ひらがなは「密度順」が直感とズレやすく、フォント依存も強い。  
指定フォントで各文字の塗りつぶし率を測り、暗→明の順に並べ替えることで、表現の破綻を抑える。

### 8.2 計測方法

- オフスクリーンバッファ（`p5.Graphics`）を使用
- サイズ: `densitySampleSize × densitySampleSize`（例: 64）
- 背景を白、文字を黒で描画
- `loadPixels()` し、黒っぽいピクセル数をカウントして比率化
  - `brightness < densityThreshold` を「インク」とみなす

### 8.3 キャッシュ

- 文字密度は重いのでキャッシュする
- key例:
  - `fontFamily + '|' + charset + '|' + densitySampleSize + '|' + densityThreshold`
- フォント/charset/計測設定が変わったら再計測

---

## 9. フォント読み込み（FontManager）

### 9.1 方針

フォント切替を自動にすると描画が一瞬フォールバックになるなど不安定になりがちなので、**Load Fontボタン**で明示的に読み込む。

### 9.2 仕様

- UIで `fontFamily` を選択
- 「Load Font」押下で:
  1. `await document.fonts.load('16px "<fontFamily>"')`
  2. `textFont(fontFamily)` を設定
  3. autoDensitySortなら `CharsetManager` が再計測
  4. `requestRedraw()`

---

## 10. UI設計（Tweakpane + 画像入力）

### 10.1 Tweakpaneに載せるもの

- グリッド/表現:
  - `cols`, `renderMode`, `imageAlpha`, `textAlpha`, `backgroundColor`
  - `gamma`, `invert`, `alphaThreshold`
  - `letterSpacing`, `jitter`
- charset:
  - `charset`, `charsetMode (auto/manual)`
  - （任意）`densitySampleSize`, `densityThreshold`
- font:
  - `fontFamily`（選択）
  - `fontSizeScale`（文字サイズ倍率）
  - `Load Font`（ボタン）

### 10.3 ショートカット
- `p`：パネル表示/非表示の切替
- `s`：Save PNG

### 10.4 Save PNG
- 保存ボタンはパネル最下部に配置
- ファイル名は `元画像名-Hiramosa-unixtime.png`

### 10.5 パネル初期状態
- 初期状態は **非表示（HIDE PANEL）**

### 10.2 画像入力UI

- サンプル画像選択（Tweakpaneのリスト or HTML select）
- ローカル画像選択（HTML file input推奨）
- 選択後:
  - `ImageManager.setImage(...)`
  - `CharsetManager` はそのまま（画像変更では密度は変わらない）
  - `requestRedraw()`

---

## 11. 再描画制御（requestRedraw）

描画要求をまとめる。

- `pendingRedraw=false`
- `requestRedraw()`:
  - pendingなら無視
  - `pendingRedraw=true`
  - `requestAnimationFrame(() => { pendingRedraw=false; redraw(); })`

---

## 12. GitHub Pages デプロイ設計

### 12.1 前提

- 静的ファイルのみで動作（サーバ不要）
- パスは **相対パス** を基本にする（Pagesでサブパス配信されても壊れない）

### 12.2 具体案

- `gh-pages` ブランチに静的ファイルを置く、または
- `main` ブランチの `/docs` を公開対象にする（GitHub Pages設定）

どちらでも成立するように、`index.html` からの参照は相対パスに寄せる。

### 12.3 注意点

- ローカル画像はブラウザ内のみ（File API）。GitHub Pages上でも問題なく動作する

---

## 13. 開発補助
- `./serve` でローカルサーバを起動
- `scripts/generate_manifest.py` でサンプル画像の manifest を自動生成
- サンプル画像は `assets/` 配下に置き、同一オリジンで配信されるためCORS問題は基本発生しない

---

## 13. 実装優先順位（設計から見た順）

1) 静的ページ骨格（index.html）+ Canvas + Tweakpane配置
2) サンプル画像ロード → overlay/textOnly の描画骨格
3) ローカル画像ロード（file input → objectURL → loadImage）
4) `imgSmall(cols×rows)` 代表色取得 → manual charsetで文字描画
5) `DensityAnalyzer` 実装 → autoDensitySort対応（デフォルト化）
6) `requestRedraw()` 実装（UI変更時のみ更新）
7) 透明セル（alphaThreshold）
8) フォント選択 + Load Fontボタン + 密度再計測
9) letterSpacing / jitter
