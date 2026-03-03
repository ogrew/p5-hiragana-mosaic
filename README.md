# Hiragana Mosaic

URL: https://ogrew.github.io/p5-hiragana-mosaic/

## Parameters

- cols (10–180): グリッドの列数。値が大きいほど文字数が増えます。
- renderMode: overlay / textOnly。元画像+文字 or 文字のみ。
- letterSpacing (0.5–2.0): 文字間隔の倍率。
- jitter (0.0–2.0): 文字位置のゆらぎ量。
- gamma (0.3–3.0): 明るさの補正。
- invert: 明暗対応を反転。
- alphaThreshold (0–255): 透明判定しきい値。
- imageAlpha (0–255): overlay時の元画像の不透明度。
- textAlpha (0–255): 文字の不透明度。
- backgroundColor: textOnly時の背景色。
- charset: 使う文字列（日本語と空白のみ）。
- charsetMode: auto / manual（密度ソート or 指定順序）。
- densitySampleSize (32–128): 密度計測用のサンプルサイズ。
- densityThreshold (0–255): 密度計測のしきい値。
- fontFamily: フォント。
- fontSizeScale (0.6–1.8): 文字サイズの倍率。
