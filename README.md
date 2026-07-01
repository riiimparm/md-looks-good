# md-looks-good

Markdownファイルをきれいに整形して表示するChrome拡張機能です。

## セットアップ

```bash
npm install
```

## 検証（型チェック）

TypeScriptの型チェックのみを行い、ビルド成果物は生成しません。

```bash
npm run typecheck
```

## ビルド

```bash
npm run build
```

`dist/` ディレクトリに拡張機能一式（`manifest.json`、`background`、`content`、`popup`、`options`、`icons` など）が出力されます。

開発中にソースの変更を自動でビルドに反映したい場合はウォッチモードを使用します。

```bash
npm run watch
```

## Chromeへのインストール

1. 上記の手順で `dist/` ディレクトリをビルドしておきます。
2. Chromeで `chrome://extensions` を開きます。
3. 右上の「デベロッパーモード」を有効にします。
4. 「パッケージ化されていない拡張機能を読み込む」をクリックします。
5. このリポジトリの `dist` ディレクトリを選択します。

インストール後、拡張機能アイコンから設定（オプション）画面やポップアップを確認できます。ソースを変更した場合は再度 `npm run build`（または `watch` 実行中は自動更新）した後、`chrome://extensions` の当該拡張機能で更新ボタンを押してください。
