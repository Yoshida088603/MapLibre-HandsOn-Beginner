# Cursor でデフォルトブラウザを Edge から Chrome にする

## 方法1: 設定 UI から（推奨）

1. Cursor で **Ctrl + ,** を押して設定を開く
2. 検索ボックスに **browser** または **external** と入力
3. **Workbench > External Browser** や **Terminal > External Browser** など、ブラウザ関連の項目を探す
4. 値を **chrome** に変更（ドロップダウンがあれば「Chrome」を選択）

## 方法2: settings.json に直接追加

1. Cursor で **Ctrl + Shift + P** を押し、「**Preferences: Open User Settings (JSON)**」を実行
2. 開いた `settings.json` に次のいずれか（または両方）を追加する

```json
"workbench.externalBrowser": "chrome",
"terminal.integrated.defaultProfile.windows": "PowerShell"
```

リンクを「外部ブラウザで開く」で Chrome にしたい場合:

```json
"workbench.externalBrowser": "chrome"
```

3. ファイルを保存（**Ctrl + S**）

## 方法3: Windows のデフォルトブラウザを Chrome にする

Cursor が「システムのデフォルトブラウザ」を参照している場合があります。

1. Windows の **設定** を開く
2. **アプリ** → **既定のアプリ**
3. **Web ブラウザ** で **Microsoft Edge** をクリックし、**Google Chrome** を選ぶ

---

**注意**: Cursor のバージョンによっては `workbench.externalBrowser` が効かない場合があります。そのときは方法3で Windows のデフォルトを Chrome にすると、多くのアプリでリンクが Chrome で開きます。
