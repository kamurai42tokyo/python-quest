# 🧑‍💻 Python Module Quest

42 Tokyo **PythonModule 00〜10** の内容を、**人生が進化するキャラクター**と一緒に
**カテゴリ別クイズ**で学べる Web アプリです。`python_collection_quest` の形態を踏襲しています。

> **現在 Phase 2 完了**：5カテゴリ（計81問）＋カテゴリ別の5キャラ（各21段階）が揃いました。
> 残るは Phase 3（スタイル/PWA仕上げ・公開）です。

## 🎮 遊び方

1. **カテゴリ**を1つ選ぶ（その人物の人生を生きる）
2. **出題形式**（出力予測 / 穴埋め・用語 / デバッグ）と**問題数**を選ぶ
3. 「人生を はじめる」でスタート。正解するたびに**人生が1段階進化**！
   - 5問 → Lv5（学生期）/ 10問 → Lv10（**42tokyo生**）/ 20問 → Lv20（**レジェンドエンジニア**）

## ✨ 設計の特徴

- **進化する人生キャラ**：正解数＝レベル。赤ちゃん → 学生 → 社会人/ニート → **42tokyo生（折返し）** → エンジニア → レジェンドへ。各段階でドット絵と人生ナレーションが変わる。
- **5カテゴリ＝5人**：1カテゴリ＝1人の人生（カテゴリは単一選択）。
- **ドット絵はコードのみ**：外部画像ゼロのパラメトリック描画（`<canvas>`）。装備・色・オーラを重ねて進化を表現。
- **静的サイト・PWA**：HTML + CSS + バニラJS。バックエンド不要。

## 🛠 ローカルで動かす

```bash
# 方法1: そのまま開く
open index.html        # macOS

# 方法2: 簡易サーバー（PWA確認も可）
python3 -m http.server 8000
# → http://localhost:8000
```

## 📁 構成

```
python_module_quest/
├── index.html        3画面の骨組み
├── css/style.css     RPGテーマ・ドット絵canvas・モバイル優先
├── js/
│   ├── data.js       出題データ（カテゴリ別）
│   ├── characters.js 進化キャラのドット絵レンダラ＋人生テーブル
│   └── app.js        出題・採点ロジック
├── manifest.json / icon.svg
└── README.md
```

## ➕ 拡張するには

- **問題を増やす**：`js/data.js` に1要素追加（`category` / `format` / `question` / `code` / `answer` / `distractors` / `explanation`）。
- **キャラを増やす**：`js/characters.js` の `CHARS` に、カテゴリ名をキーにした人物（`name` と 0〜20段階の `stages`）を追加。

## 🗺 ロードマップ

- [x] Phase 0：基礎・構文（人物1人・全段階・問題＋ロジック＋3画面）
- [x] Phase 1：残り4カテゴリの問題データ（計81問・全カテゴリ playable）
- [x] Phase 2：5キャラ（ハジメ/ラム/タクミ/ラー王/デー太）各21段階のドット絵
- [ ] Phase 3：スタイル/PWA仕上げ・公開（GitHub Pages）

---
Made for learning 42 Tokyo PythonModule.
