// 厳密モード
'use strict';
// sequelizeモジュール呼び出し
// http://docs.sequelizejs.com/
const Sequelize = require('sequelize');
/** 
 * データベースに接続する
 * 第一引数：URL形式のデータベースの設定
 * 　　　　　{DBの種類}://{ユーザー名}:{パスワード}@{ホスト名}/{データベース名}
 * 　　　　　という形式？　なぜDBの種類とパスワードとユーザー名を同じ文字列にしたのか。
 * 第二引数：オプション設定のオブジェクト
 * 　　logging:ログとして出力するか
*/
const sequelize = new Sequelize(
    'postgres://postgres:postgres@localhost/secret_board',
    {
        logging: false
    }
);
//↓これでも接続できた。こっちの方が直感的な気がする。
/**
 * データベースに接続する
 * 第一引数：データベース名
 * 第二引数：ユーザー名
 * 第三引数：パスワード
 * 第四引数：オプション設定のオブジェクト
 * 　　host: ホスト名（サーバー名）
 * 　　dialect: DBの種類(postgresとか)
 * 　　logging: ログとして出力するか
 */
/*const sequelize = new Sequelize(
    'secret_board', 'postgres', 'postgres',{
        host: 'localhost',
        dialect: 'postgres',
        logging: false
    }
);*/
// idカラムの設定のオブジェクト。
// type: データ型
// autoIncrement: データ作成時にidを１ずつ増加する
// primaryKey: 主キー（レコードをただひとつに特定できるキー）
let idColumn = {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
};
// contentカラムの設定オブジェクト
// TEXT型は可変長文字列の型
let contentColumn = {
    type: Sequelize.TEXT
};
// postedByColumnカラムの設定オブジェクト
let postedByColumn = {
    type: Sequelize.TEXT
};
// trackingCookieColumnカラムの設定オブジェクト
// STRING型は255文字までの文字列を格納できるデータ型
let trackingCookieColumn = {
    type: Sequelize.STRING
};
// それぞれの設定をカラム名のプロパティに設定する
let columns = {
    id: idColumn,
    content: contentColumn,
    postedBy: postedByColumn,
    trackingCookie: trackingCookieColumn
};
// テーブル全般に関する設定のオブジェクト
// freezeTableNameプロパティはモデル名をそのままカラム名に使用するという意味らしい
// trueだとRuby on Railsみたいにテーブル名を複数形にしてしまうようだ
// timestampsプロパティはtimestamps用のカラム(createdAt(作成時間)とupdatedAt(更新時間))を自動的に追加してくれる
let dbOptions = {
    freezeTableName: true,
    timestamps: true
}
/**
 * Modelを作成する。
 * 第一引数：モデル名（テーブル名）
 * 第二引数：作成するテーブルのカラム情報のオブジェクト
 */
const Post = sequelize.define('Post', columns, dbOptions);
/**
 * テーブルを作成する。
 * 設定を変更した場合はsync({force: true})で強制DROP TABLEしてから再構築することもできるらしい
 */
Post.sync();
// モジュールに関数を登録する
module.exports = Post;