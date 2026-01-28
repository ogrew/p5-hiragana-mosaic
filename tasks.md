# tasks.md

> 進め方の前提  
> - 上から順に実行すれば、実装 → 動作確認 → GitHub Pages公開まで滞りなく到達できる構成。  
> - ここでの「完了条件」は、次工程に進んで破綻しない最低限の品質を指す。  
> - 途中で仕様変更が出た場合は、まず `requirements.md / design.md` を更新してから戻って作業を続ける。

---

## 1. リポジトリ準備（公開前提の足場）

### 1.1 プロジェクト構造の初期化
- 1.1.1 リポジトリ作成
  - https://github.com/ogrew/p5-hiragana-mosaic
  - username: ogrew
- 1.1.2 ディレクトリ作成
  - `index.html`
  - `src/`（JSモジュール群）
  - `assets/samples/`（サンプル画像置き場）
- 1.1.3 `.gitignore` 追加（不要ファイル除外）
- 1.1.4 `README.md` 追加（最低限：目的 / 使い方 / 公開URL欄（後で記入））

### 1.2 ローカル動作環境
- 1.2.1 ローカル静的サーバで動く前提を用意
  - 例：`python -m http.server` など（方法は自由）
- 1.2.2 ブラウザで `index.html` を開き、コンソールエラーが出ないことを確認

### 1.3 依存読み込み方針の決定（GitHub Pages対応）
- 1.3.1 p5.js / Tweakpane を **CDN** で読むか、同梱するか決める
- 1.3.2 方針に沿って `index.html` に読み込みを記述
- 1.3.3 GitHub Pagesのサブパス配信を想定し、相対パス参照になっていることを確認

---

## 2. UI土台（Tweakpaneと画像入力UIの骨格）

### 2.1 画面レイアウトの確立
- 2.1.1 Canvas領域 + 右側UIパネル領域のレイアウトを実装（CSS）
- 2.1.2 ウィンドウリサイズ時に破綻しない（最低限のレスポンシブ）

### 2.2 Tweakpane初期化
- 2.2.1 `src/ui.js` を作成し、Paneを生成
- 2.2.2 パラメータオブジェクト（`params`）を定義
- 2.2.3 変更イベントを受けて `requestRedraw()` を呼べる配線だけ先に作る

### 2.3 画像入力UI（サンプル + ローカル）
- 2.3.1 サンプル画像の選択UIを用意
  - Tweakpaneリスト or HTML `<select>`（どちらでもOK）
- 2.3.2 ローカル画像選択の `<input type="file" accept="image/*">` を用意
- 2.3.3 選択イベントをフックし、「画像を切り替えた」ことが分かるログを出す（まだ描画しなくて良い）

---

## 3. 画像ロードと表示（まず絵が出る状態へ）

### 3.1 ImageManagerの実装
- 3.1.1 `src/image_manager.js` 作成
- 3.1.2 サンプル画像URLから p5 `loadImage()` でロードできる
- 3.1.3 ローカル画像を objectURL 経由でロードできる
- 3.1.4 objectURL の `revokeObjectURL()` を適切に実施（不要になったら解放）

### 3.2 画像のfit（displayW/H計算）
- 3.2.1 ビューポートに収まる表示サイズを算出（アスペクト維持）
- 3.2.2 Canvasサイズを表示サイズに合わせて生成・更新できる
- 3.2.3 画像ロード後に「元画像が表示される（overlayの下地）」状態を作る

### 3.3 描画モードの骨格（overlay / textOnly）
- 3.3.1 overlay：元画像のみ描画（まだ文字なし）
- 3.3.2 textOnly：背景色のみ描画（まだ文字なし）
- 3.3.3 UIでモード切替して見た目が変わることを確認

**完了条件**
- サンプル画像とローカル画像の両方で、Canvasに正しく表示できる  
- overlay/textOnly 切替が効く

---

## 4. 再描画制御（noLoop + requestRedraw）

### 4.1 noLoop適用
- 4.1.1 `setup()` で `noLoop()` を設定
- 4.1.2 画面が常時更新されていないことを確認（CPUが無駄に回らない）

### 4.2 requestRedrawの実装
- 4.2.1 `pendingRedraw` フラグを持つ
- 4.2.2 `requestAnimationFrame` で redrawをまとめる
- 4.2.3 UI変更、画像変更イベントから `requestRedraw()` を呼ぶ

**完了条件**
- UI操作中でも redraw が暴発せず、操作に応じて画面が更新される

---

## 5. ひらがな描画の最小実装（manual charsetで成立させる）

### 5.1 Rendererの骨格
- 5.1.1 `src/renderer.js` 作成
- 5.1.2 描画処理を `render(params, state)` のように分離
- 5.1.3 画像領域クリップを適用できるようにする（`drawingContext.clip()`）

### 5.2 グリッド計算（cols固定、rows自動）
- 5.2.1 `cols` から `cellW` を決定（`cellH=cellW` 固定）
- 5.2.2 `rows = ceil(displayH / cellH)` を算出
- 5.2.3 最終行のはみ出しはクリップで見せない

### 5.3 imgSmallサンプリング（1ピクセル=1セル）
- 5.3.1 `imgSmall = img.get(); imgSmall.resize(cols, rows)` を作成
- 5.3.2 `imgSmall.loadPixels()` して `samplePixel(cx, cy)` 関数を用意
- 5.3.3 代表色RGBを取得し、文字色に使えることを確認

### 5.4 明度→文字インデックス（manual charset）
- 5.4.1 luma計算（係数方式）
- 5.4.2 gamma適用
- 5.4.3 invert対応（反転）
- 5.4.4 `charset[idx]` で文字選択して描画（位置はセル中心）

### 5.5 透明セル（alphaThreshold）
- 5.5.1 `a < alphaThreshold` のセルは描画しない
- 5.5.2 透明PNGで文字が出ないことを確認

**完了条件**
- manual charsetで、画像がひらがなグリッド表現に変換されて表示される  
- cols / gamma / invert / alphaThreshold が視覚的に効く

---

## 6. 表現パラメータ（letterSpacing / jitter / alpha）

### 6.1 文字アルファ・画像アルファ
- 6.1.1 overlayの `imageAlpha` を適用（tint）
- 6.1.2 文字の `textAlpha` を適用（fillのalpha）
- 6.1.3 textOnlyの `backgroundColor` を適用

### 6.2 letterSpacing
- 6.2.1 `stepX/Y = cellW * letterSpacing` を導入
- 6.2.2 グリッド全体を画像領域中央に寄せる（origin補正）
- 6.2.3 文字が偏らずにスケールすることを確認

### 6.3 jitter（決定的ランダム）
- 6.3.1 `randomSeed(seed)` を使い、redrawごとに結果がブレないようにする
- 6.3.2 `jitter=0` で無効になる
- 6.3.3 jitterを上げたときに表情が変わるが、破綻しない範囲を探る

**完了条件**
- overlay/textOnly + alpha + letterSpacing + jitter がUIで調整でき、見た目に反映される

---

## 7. 自動密度ソート（autoDensitySortをデフォルト化）

### 7.1 DensityAnalyzerの実装
- 7.1.1 `src/density.js` 作成
- 7.1.2 `p5.Graphics` で文字をオフスクリーン描画
- 7.1.3 `loadPixels()` を走査して密度（インク率）を算出
- 7.1.4 文字ごとの密度を降順でソートできる

### 7.2 CharsetManagerの実装
- 7.2.1 `src/charset_manager.js` 作成
- 7.2.2 モード：`auto` / `manual` を持つ
- 7.2.3 auto時：密度ソートした文字列を生成してRendererに渡す
- 7.2.4 キャッシュキー設計（font + charset + sampleSize + threshold）
- 7.2.5 charset変更時に再構築し、描画に反映する

### 7.3 UI連携（デフォルトauto）
- 7.3.1 `charsetMode` のUIを追加（autoがデフォ）
- 7.3.2 auto/manual切替で結果が変わることを確認
- 7.3.3 （任意）`densitySampleSize` / `densityThreshold` をUI化

**完了条件**
- 同じcharsetでもフォントが変わると密度順が変わり得ることを確認できる  
- autoがデフォルトで動作し、manualにも戻せる

---

## 8. フォント管理（Load Fontボタンで明示適用）

### 8.1 FontManagerの実装
- 8.1.1 `src/font_manager.js` 作成
- 8.1.2 `document.fonts.load()` を `Load Font` ボタンから呼べる
- 8.1.3 ロード完了後に `textFont(fontFamily)` を反映
- 8.1.4 ロード完了後に autoDensitySort を再計測する（必要なら）

### 8.2 フォント候補の組み込み
- 8.2.1 `index.html` に Google Fonts を追加
  - Nico Moji（earlyaccess）
  - M PLUS 1p
  - さわらび明朝
- 8.2.2 UIでフォントを選び、Load Fontで反映されることを確認

### 8.3 失敗時の挙動
- 8.3.1 フォントロード失敗を検知できるようにする（最低限ログ）
- 8.3.2 フォールバックフォントで継続できる

**完了条件**
- Load Font押下でフォントが確実に切り替わり、auto密度ソートも再計測される

---

## 9. UIの仕上げ（操作性と安全柵）

### 9.1 パラメータの範囲・刻み
- 9.1.1 `cols` の最小/最大とステップを決める（例：20〜240）
- 9.1.2 `gamma` の範囲（例：0.3〜3.0）
- 9.1.3 `letterSpacing` の範囲（例：0.5〜2.0）
- 9.1.4 `jitter` の範囲（例：0〜cellW*0.5 相当）※UI上は0..1で倍率でも良い
- 9.1.5 `alphaThreshold` の範囲（0..255）

### 9.2 UX小物
- 9.2.1 現在の有効charset（auto後の並び）を表示（任意）
- 9.2.2 「Reset」ボタンでデフォルトに戻す（任意）
- 9.2.3 画像未ロード時のガイド表示

### 9.3 例外系
- 9.3.1 charset空のときに落ちない（警告して描画しない）
- 9.3.2 colsが大きすぎて重い場合の注意表示（任意）

---

## 10. テスト・検証（最低限の動作保証）

### 10.1 ケース別確認
- 10.1.1 JPG（不透明）で表示・変換できる
- 10.1.2 PNG（透明あり）で透明セルが描画されない
- 10.1.3 極端に縦長/横長の画像で隙間が出ない
- 10.1.4 高解像度画像でも破綻せず動く（colsを上げすぎない範囲で）

### 10.2 パフォーマンス確認
- 10.2.1 noLoopが効いている（放置時にCPUが回らない）
- 10.2.2 UI操作時の体感が許容範囲（特にcols大・auto密度計測後）

### 10.3 ブラウザ互換（最低限）
- 10.3.1 Chromeで動作
- 10.3.2 Safariで動作（ローカル画像選択・フォントロード含む）

---

## 11. サンプル画像整備（公開品質）

### 11.1 サンプル画像の追加
- 11.1.1 `assets/samples/` に数枚追加（JPG/PNG混在）
- 11.1.2 サンプル一覧に反映（配列 or UIリスト）
- 11.1.3 画像の著作権・利用条件を確認（自作 or フリー素材推奨）

### 11.2 初期プリセットの調整
- 11.2.1 デフォルト `charset` を決める（全角スペース含む推奨）
- 11.2.2 デフォルト `cols/gamma/alpha` を作品として見栄え良く調整

---

## 12. 公開（GitHub Pages）

### 12.1 Pages設定
- 12.1.1 公開方法を選ぶ
  - `main` の `/docs` を公開 or `gh-pages` ブランチに出す
- 12.1.2 GitHub Pages設定で公開を有効化
- 12.1.3 公開URLで動作確認

### 12.2 Pagesでのパス問題を潰す
- 12.2.1 サンプル画像参照が相対パスで動く
- 12.2.2 JS/CSS参照が相対パスで動く
- 12.2.3 ローカル画像選択がPages上でも動く（File API）

### 12.3 公開向けドキュメント
- 12.3.1 `README.md` に以下を追記
  - 公開URL
  - 使い方（サンプル/ローカル/フォントロード）
  - 注意（ローカル画像は外部送信されない、など）
- 12.3.2 `requirements.md / design.md / tasks.md` が最新版であることを確認

**完了条件**
- 公開URLにアクセスして、サンプル画像選択・ローカル画像選択・フォントロード・各パラメータ調整が一通り動く

---

## 13. 仕上げ（任意だがやるなら最後）

### 13.1 作品としての磨き込み
- 13.1.1 デフォルトパラメータを作品向けに詰める
- 13.1.2 charsetの候補プリセット（複数）を用意（任意）
- 13.1.3 画面キャプチャ用の「Save」ボタン（将来拡張、今回は任意）

### 13.2 軽量化・安全性
- 13.2.1 大きすぎるローカル画像を選んだときのガード（任意）
- 13.2.2 density計測の再実行頻度を抑える（キャッシュの効き確認）
