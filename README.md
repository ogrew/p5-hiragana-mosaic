# Hiragana Mosaic

URL: https://ogrew.github.io/p5-hiragana-mosaic/

## Parameters

### Grid
- cells (20–150): グリッドの列数。値が大きいほど文字数が増えます。
- letterSpacing (0.5–2.0): 文字間隔の倍率。
- jitter (0.0–2.0): 文字位置のゆらぎ量（最大で各軸 ±1.0 * cellW）。

### Font
- fontFamily: フォント。
- fontSize (0.5–2.5): 文字サイズの倍率。

### Charset
- charset: 使う文字列（日本語と空白のみ）。
- charsetMode: auto / manual（密度ソート or 指定順序）。
- Density
- sampleSize (32–128): 密度計測用のサンプルサイズ。
- densityThreshold (0–255): 密度計測のしきい値。

### Tone
- gamma (0.3–3.0): 明るさの補正。
- invert: 明暗対応を反転。
- alphaThreshold (0–255): 透明判定しきい値。

### Noise
- seed (0–1,000,000): ノイズのシード値。
- freqX (0.005–0.209): X方向ノイズ周波数。
- freqY (0.005–0.200): Y方向ノイズ周波数。
- noiseThreshold (0.0–1.0): ノイズしきい値。

### Render
- renderMode: overlay / textOnly。元画像+文字 or 文字のみ。
- imageAlpha (0–255): overlay時の元画像の不透明度。
- textAlpha (0–255): 文字の不透明度。
- bgColor: textOnly時の背景色。
