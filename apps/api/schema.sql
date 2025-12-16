-- Citour D1 Database Schema
-- Single database with tenant_id for multi-tenancy

-- ==================== SYSTEM TABLES ====================

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users (admins + students)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    account TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('sys_admin', 'admin', 'student')),
    class_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, account)
);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ==================== BUSINESS TABLES ====================

-- Word Books
CREATE TABLE IF NOT EXISTS word_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'offline' CHECK(status IN ('online', 'offline')),
    word_count INTEGER DEFAULT 0,
    daily_target INTEGER DEFAULT 20,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
CREATE INDEX IF NOT EXISTS idx_word_books_tenant ON word_books(tenant_id);
CREATE INDEX IF NOT EXISTS idx_word_books_status ON word_books(status);

-- Words
CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    spelling TEXT NOT NULL,
    meaning TEXT NOT NULL,
    sentence TEXT,
    phonics_data TEXT,
    root_info TEXT,
    audio_url TEXT,
    difficulty INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (book_id) REFERENCES word_books(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_words_tenant ON words(tenant_id);
CREATE INDEX IF NOT EXISTS idx_words_book ON words(book_id);

-- ==================== STUDY PLAN TABLES ====================

-- Study Plans (学生单词本学习状态)
CREATE TABLE IF NOT EXISTS study_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    status TEXT DEFAULT 'not_started' CHECK(status IN ('not_started', 'learning', 'completed')),
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES word_books(id) ON DELETE CASCADE,
    UNIQUE(user_id, book_id)
);
CREATE INDEX IF NOT EXISTS idx_study_plans_user ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_status ON study_plans(user_id, status);

-- Learning Tasks (学习任务，合并练习会话)
CREATE TABLE IF NOT EXISTS learning_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    word_ids TEXT NOT NULL,
    total_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
    -- 练习统计（原 practice_sessions）
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    hint_count INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES word_books(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_user ON learning_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_book ON learning_tasks(book_id);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_status ON learning_tasks(user_id, status);

-- Wrong Words (error book)
CREATE TABLE IF NOT EXISTS wrong_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    word_id INTEGER NOT NULL,
    book_id INTEGER,
    task_id INTEGER,
    wrong_spelling TEXT NOT NULL,
    correct_spelling TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed INTEGER DEFAULT 0,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (word_id) REFERENCES words(id),
    FOREIGN KEY (book_id) REFERENCES word_books(id),
    FOREIGN KEY (task_id) REFERENCES learning_tasks(id)
);
CREATE INDEX IF NOT EXISTS idx_wrong_words_user ON wrong_words(user_id);
CREATE INDEX IF NOT EXISTS idx_wrong_words_book ON wrong_words(user_id, book_id);

-- ==================== SEED DATA ====================

-- Create default system admin tenant (tenant_id = 0 for system)
INSERT OR IGNORE INTO tenants (id, name, status) VALUES (0, 'System', 'active');

-- Create default system admin user
INSERT OR IGNORE INTO users (id, tenant_id, name, account, password, role) 
VALUES (1, 0, '系统管理员', 'admin', 'admin123', 'sys_admin');


-- ==================== EXPORTED DATA ====================

INSERT OR IGNORE INTO word_books (id, tenant_id, name, description, status, word_count, daily_target) VALUES (1, 1, '个人身份与家庭', '“个人身份与家庭”是人类语言习得中最先建立的词汇领域，也是 A2 考试的基石。从语言历史学的角度来看，这一板块的词汇绝大多数属于英语中最古老的“核心词汇层”（Core Vocabulary），主要源自古英语（Old English）和日耳曼语系。这些词汇通常具有音节短、发音重、拼写规则相对保守的特点。
在语音学上，这一类别的词汇频繁出现“闭音节”（Closed Syllable）结构，即以辅音结尾的音节，如 dad, mum, son。这对中国学习者构成了一定的发音挑战，因为汉语普通话的音节通常以元音或鼻音 /n/, /ng/ 结尾，缺乏像 /d/, /t/, /k/ 这样的塞音韵尾。学习者容易在这些词末辅音后添加不必要的元音（Schwa，即 /ə/），例如将 dad 发音为 dad-uh。本报告在自然拼读信息中将特别标注这些闭音节特征，以纠正发音习惯。
在形态学层面， -er 后缀在该话题中极为活跃，用于表示亲属关系或身份及其对应的社会功能（如 father, mother, sister, brother）。这些词汇的词源深度极深，许多可以追溯到原始印欧语（Proto-Indo-European, PIE）。例如，mother 对应 PIE 的 mater，这与汉语中的“妈”（mā）在发音上的惊人相似性，展示了跨语言的普遍性。此外，合成词（Compound Words）的概念在此话题中初现端倪，如 grandmother（grand + mother）和 boyfriend（boy + friend）。这为学生理解英语构词法的“加法原则”提供了绝佳的入门案例 。', 'online', 35, 20);
INSERT OR IGNORE INTO word_books (id, tenant_id, name, description, status, word_count, daily_target) VALUES (2, 1, '日常生活与爱好', '“日常生活与爱好”这一板块的语言学重心从静态的名词转向了描述动作的动词和描述状态的抽象名词。在剑桥 A2 语料库中，这一部分是词汇搭配（Collocations）最密集的区域，如 have breakfast（吃早饭，注意不能用 eat），take a shower（洗澡），play football（踢足球，注意不加 the）。这些搭配的习得比单一词汇的记忆更为重要，因为它们构成了英语流利表达的基础逻辑。
在语音学层面，爱好类词汇大量包含了“元音组合”（Vowel Teams）和双元音。例如 play 中的 /eɪ/，read 中的 /iː/，以及 paint 中的 /eɪ/。中国学习者常犯的一个发音错误是将这些长元音缩短，例如将 seat 发成 sit。此外，本话题包含大量复合名词，如 basketball, homework, newspaper。英语复合名词的重音规则通常落在第一个词素上（如 BASKETball），这一韵律特征对于听力理解至关重要。
词源学揭示了休闲活动的阶级分层历史。基础的身体动作如 run, swim, walk 均源自古英语，属于日耳曼语系，强调动作的直接性。而有组织的休闲活动往往源自法语或拉丁语，如 music 源自希腊语 mousikē（缪斯女神的艺术），photography 源自希腊语词根 photo-（光）和 -graphy（书写）。在 A2 阶段引入这些词根，能有效帮助学生在未来 B1/B2 阶段扩展出 photograph, photographer, graphic 等同根词族，实现词汇量的指数级增长 。', 'online', 35, 20);
INSERT OR IGNORE INTO word_books (id, tenant_id, name, description, status, word_count, daily_target) VALUES (3, 1, '饮食与餐饮', '英语饮食词汇是 1066 年诺曼征服历史的活化石。这一历史事件导致了英语中动物名称与肉类名称的分离：田间劳作的撒克逊农民养的是 cow, sheep, pig（日耳曼语源），而餐桌上诺曼贵族吃的是 beef, mutton, pork（法语源 boef, mouton, porc）。这种双层词汇体系是英语区别于其他日耳曼语言的显著特征，也是 A2 学习者必须掌握的文化背景。

在语法功能上，本话题是教授“可数名词”（Countable）与“不可数名词”（Uncountable）区别的最佳场景。这对中国学生极具挑战，因为汉语名词没有单复数的形态变化，且依赖量词。英语中，apple 是可数的（an apple），而 bread 是不可数的（some bread，不能说 a bread）。通过本数据库中的例句，学生可以隐性地习得这些规则（如使用量词 slice of, bottle of, cup of）。

语音方面，食物词汇充满了不规则性。Bread, head 和 read (过去式) 中的 "ea" 发短音 /e/，这与 tea, meat 中的 "ea" 发长音 /iː/ 形成对比。此外，fruit, juice, biscuit 等词展示了法语拼写对英语发音规则的干扰（如 biscuit 中 u 不发音，fruit 中 i 不发音）。本板块的数据将详细解析这些语音陷阱 。', 'online', 39, 20);
INSERT OR IGNORE INTO word_books (id, tenant_id, name, description, status, word_count, daily_target) VALUES (4, 1, '教育与学校', '“教育”话题引入了大量通用学术词汇（General Service List），这些词汇构成了英语学术表达的基础。由于欧洲正规教育体系深受古希腊罗马文化影响，本板块词汇大量源自拉丁语和希腊语。这为学习者提供了一个绝佳的机会，通过识别常见的拉丁词根和后缀来批量记忆单词。
重点关注后缀 -tion（如 competition, information, instruction），其发音固定为 /ʃən/，且重音通常落在该后缀的前一个音节。另一组重要词根是 ject（投/扔），出现在 subject（科目/扔在下面的东西）、project（项目/向前投射）、object（物体/反对）。掌握这些词根意义，能帮助学生从死记硬背字母转向理解词义逻辑。
此外，本话题包含一些极易混淆的概念（False Friends），需要通过例句明确区分。例如 class 既可以指“班级”（一群人），也可以指“一节课”（一段时间），还可以指“教室”（空间，通常用 classroom）。Study 指“学习”的动作过程，而 learn 指“学会”的结果。这种动词体（Aspect）的区别是英语语法的精髓之一。', 'online', 35, 20);
INSERT OR IGNORE INTO word_books (id, tenant_id, name, description, status, word_count, daily_target) VALUES (5, 1, '交通与旅行', '交通与旅行词汇是 KET 考试中听力（广播通知）和阅读（旅游手册）部分的高频考点。这一板块的语言学特征在于“复合词”（Compound Nouns）的高密度分布，如 airport (air + port), railway (rail + way), suitcase (suit + case)。理解这些复合词的构成逻辑，能让学生迅速掌握词义。

介词搭配（Collocations with Prepositions）是本话题的难点。英语中描述交通方式使用 by（by car, by bus），但描述位置时则区分 in 和 on。我们说 in a car/taxi（因为空间狭小，必须坐着），却说 on a bus/train/plane/ship（因为空间大，可以站立行走）。这种认知语言学的空间隐喻（Metaphor of Space）对中国学生来说是全新的概念。

词根方面，cycle（圆/轮子）构成了 bicycle（两轮）和 tricycle（三轮）的基础；port（港口/门）构成了 airport（空港）和 passport（通过港口的凭证）。通过这些词根的串联，学生可以构建起交通词汇的家族树。', 'online', 36, 20);
INSERT OR IGNORE INTO word_books (id, tenant_id, name, description, status, word_count, daily_target) VALUES (6, 1, '工作与职业', '职业词汇展示了英语构词法中最具生产力的后缀规则：-er 和 -or。大多数职业名称由动词加后缀构成，如 teach + er = teacher，act + or = actor。这种规律性极大地降低了记忆负担。然而，也存在历史遗留的特殊形式，如 cook（既是动词也是名词，表示厨师，注意 cooker 是厨具），以及源自法语的 chef（主厨，ch 发 /ʃ/）。

语音学上的一个关键点是 Schwa（中央元音 /ə/）的普遍使用。在 doctor, teacher, driver 等词的结尾，元音字母 o, e, i 均弱读为 /ə/。中国学生倾向于根据拼写清晰地读出每一个元音（如将 doctor 读成 doc-torr），这是造成“中式英语”口音的主要原因之一。本数据库特别标注了这些弱读现象。

此外，business 一词是典型的“音节缩减”（Syncope）案例。虽然拼写看起来是 busi-ness（三个音节），但在标准口语中缩减为两音节 /ˈbɪz.nɪs/。', 'online', 30, 20);
INSERT OR IGNORE INTO word_books (id, tenant_id, name, description, status, word_count, daily_target) VALUES (7, 1, '房屋与家居', '“房屋”话题包含了大量描述日常生活环境的具体名词。语言学上，这里有许多“房间”的合成词（bedroom, bathroom, living room, dining room），它们遵循“功能+房间”的构词逻辑。

需要特别注意的是“家具”（furniture）这个词，它是不可数名词，这与汉语习惯完全不同。学生不能说 a furniture，只能说 some furniture 或 a piece of furniture。

语音方面，cupboard（橱柜）是一个经典的语音同化案例。它由 cup 和 board 组成，但在快速语流中，p 和 b 同化，导致发音变为 /ˈkʌb.əd/，p 完全不发音，且 board 弱读。这是一个如果不专门教授，学生几乎无法通过拼写猜出发音的单词。', 'online', 30, 20);
INSERT OR IGNORE INTO word_books (id, tenant_id, name, description, status, word_count, daily_target) VALUES (8, 1, '健康身体与感觉', '身体部位词汇保留了古英语最原始的特征，包括不规则复数变化（Mutation Plurals）。Foot 变为 feet，tooth 变为 teeth，这是日耳曼语元音变音（Umlaut）的历史残留。

在表达感觉时，A2 级别要求区分形容词的 -ed 和 -ing 形式。Bored 表示“感到无聊的”（人的感觉），Boring 表示“令人无聊的”（事物的属性）。通过词根 bore（钻孔/使厌烦）的讲解，学生可以理解这种因果关系。', 'online', 31, 20);
INSERT OR IGNORE INTO word_books (id, tenant_id, name, description, status, word_count, daily_target) VALUES (9, 1, '衣服与配饰', '服装词汇中存在大量的“唯复数名词”（Pluralia Tantum），如 trousers, jeans, shorts, glasses。这些词在逻辑上是由两部分组成的（两条裤腿、两个镜片），因此在英语中始终被视为复数。中国学生常犯的错误是用 a trousers，正确的表达是 a pair of trousers。

语音上，clothes /kləʊðz/ 是公认的发音难点。/ðz/ 的辅音连缀对于许多非母语者来说极难发出。在口语速读中，甚至母语者也会简化为 /kləʊz/（与 close 同音）。本数据库如实记录了标准音，但教师在教学中应知晓这一简化的存在。', 'online', 27, 20);
INSERT OR IGNORE INTO word_books (id, tenant_id, name, description, status, word_count, daily_target) VALUES (10, 1, '自然界与天气', '描述天气的词汇是学习英语构词法（Morphology）的极佳案例。英语通过在名词后添加后缀 -y 来构成形容词：sun → sunny, wind → windy, cloud → cloudy。注意在 sunny 和 foggy 中，需要双写辅音字母以保持元音的短音性质，这是自然拼读的重要规则。

在词源上，自然界的基本元素（太阳、月亮、水、树）几乎全部源自古英语。而季节词汇中，autumn 源自拉丁语，而美式英语保留了更古老的英语词汇 fall（落叶的季节）。KET 考试同时接受 autumn 和 fall。', 'online', 29, 20);

INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (1, 1, 1, 'family', '家庭', 'My family lives in Beijing.', '/ˈfæm.ə.li/ (fam-i-ly) - 短元音 a', 'Latin familia (家庭仆人/亲属)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (2, 1, 1, 'mother', '母亲', 'My mother is a teacher.', '/ˈmʌð.ə(r)/ (moth-er) - 短元音 u', 'Old English modor (女性双亲)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (3, 1, 1, 'father', '父亲', 'His father works in a bank.', '/ˈfɑː.ðə(r)/ (fa-ther) - 长元音 a', 'Old English fæder (男性双亲)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (4, 1, 1, 'parent', '父母', 'My parents are both doctors.', '/ˈpeə.rənt/ (par-ent) - 空气 air 的发音', 'Latin parere (生产/生育)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (5, 1, 1, 'brother', '兄弟', 'I have one younger brother.', '/ˈbrʌð.ə(r)/ (broth-er) - 短元音 u', 'Old English brothor', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (6, 1, 1, 'sister', '姐妹', 'Her sister likes to play tennis.', '/ˈsɪs.tə(r)/ (sis-ter) - 短元音 i', 'Old English sweostor', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (7, 1, 1, 'son', '儿子', 'They have a son and a daughter.', '/sʌn/ (sun) - 同音词 sun (太阳)', 'Old English sunu', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (8, 1, 1, 'daughter', '女儿', 'Their daughter is five years old.', '/ˈdɔː.tə(r)/ (daugh-ter) - 组合 au 发 /ɔː/', 'Old English dohtor', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (9, 1, 1, 'grandmother', '祖母; 外祖母', 'My grandmother makes good cake.', '/ˈɡræn.mʌð.ə(r)/', 'Compound: French grand + English mother', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (10, 1, 1, 'grandfather', '祖父; 外祖父', 'I walk in the park with my grandfather.', '/ˈɡræn.fɑː.ðə(r)/', 'Compound: French grand + English father', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (11, 1, 1, 'husband', '丈夫', 'Her husband is Canadian.', '/ˈhʌz.bənd/ (hus-band) - 短元音 u', 'Old Norse husbondi (一家之主)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (12, 1, 1, 'wife', '妻子', 'His wife is a famous artist.', '/waɪf/ (wife) - i-e 结构 (Magic E)', 'Old English wif (女人)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (13, 1, 1, 'child', '儿童; 小孩', 'The child is playing with a ball.', '/tʃaɪld/ (child) - 长元音 i', 'Old English cild', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (14, 1, 1, 'children', '孩子们 (复数)', 'The children are at school.', '/ˈtʃɪl.drən/ (chil-dren) - i 变短音', 'child 的不规则复数', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (15, 1, 1, 'baby', '婴儿', 'The baby is sleeping now.', '/ˈbeɪ.bi/ (ba-by) - y 发长音 e', 'Middle English babi', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (16, 1, 1, 'boy', '男孩', 'The boy has a new bike.', '/bɔɪ/ (boy) - oy 组合', 'Middle English boie', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (17, 1, 1, 'girl', '女孩', 'The girl has long hair.', '/ɡɜːl/ (girl) - ir 组合 (r-controlled)', 'Middle English gurle', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (18, 1, 1, 'friend', '朋友', 'She is my best friend.', '/frend/ (friend) - ie 组合发 /e/', 'Old English freond (爱人/朋友)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (19, 1, 1, 'guest', '客人', 'We have a guest for dinner.', '/ɡest/ (guest) - u 不发音', 'Old Norse gestr (陌生人)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (20, 1, 1, 'neighbour', '邻居', 'My neighbour is very friendly.', '/ˈneɪ.bə(r)/ (neigh-bour) - eigh 发 /ei/', 'Old English neah (近) + gebur (居民)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (21, 1, 1, 'name', '名字', 'What is your name?', '/neɪm/ (name) - a-e 结构 (Magic E)', 'Old English nama', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (22, 1, 1, 'surname', '姓', 'Please write your surname here.', '/ˈsɜː.neɪm/ (sur-name) - ur 组合', 'French surnom (额外的名字)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (23, 1, 1, 'age', '年龄', 'I don''t know his age.', '/eɪdʒ/ (age) - g 发软音 /dʒ/', 'Old French aage', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (24, 1, 1, 'adult', '成年人', 'This film is for adults only.', '/ˈæd.ʌlt/ (ad-ult) - 重音可变', 'Latin adultus (长大的)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (25, 1, 1, 'person', '人', 'She is a nice person.', '/ˈpɜː.sn/ (per-son) - er 组合', 'Latin persona (面具/角色)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (26, 1, 1, 'people', '人们', 'Many people like football.', '/ˈpiː.pl/ (peo-ple) - eo 发长音 i', 'Latin populus', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (27, 1, 1, 'man', '男人', 'The man is washing his car.', '/mæn/ (man) - 梅花音 /æ/', 'Old English mann', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (28, 1, 1, 'woman', '女人', 'That woman is my aunt.', '/ˈwʊm.ən/ (wom-an) - o 发 /ʊ/', 'Old English wifman', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (29, 1, 1, 'cousin', '堂(表)兄弟姐妹', 'My cousin lives in London.', '/ˈkʌz.ən/ (cou-sin) - ou 发 /ʌ/', 'Latin consobrinus', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (30, 1, 1, 'aunt', '阿姨; 姑姑', 'My aunt is a doctor.', '/ɑːnt/ (aunt) - au 发 /ɑː/', 'Old French ante', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (31, 1, 1, 'uncle', '叔叔; 舅舅', 'My uncle drives a taxi.', '/ˈʌŋ.kl/ (un-cle) - cle 结尾', 'Latin avunculus (母亲的兄弟)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (32, 1, 1, 'teenager', '青少年', 'Teenagers like loud music.', '/ˈtiːnˌeɪ.dʒə(r)/', 'Suffix teen + age + er', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (33, 1, 1, 'grandchild', '孙子/孙女', 'She loves her grandchild.', '/ˈɡræn.tʃaɪld/', 'Compound: grand + child', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (34, 1, 1, 'address', '地址', 'What is your home address?', '/əˈdres/ (ad-dress) - dd 双写', 'Old French adresser (指引)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (35, 1, 1, 'nationality', '国籍', 'What is your nationality?', '/ˌnæʃ.əˈnæl.ə.ti/', 'Nation + al + ity', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (36, 1, 2, 'activity', '活动', 'We do many activities in class.', '/ækˈtɪv.ə.ti/ - 结尾 y 发 /i/', 'Latin actio (行动)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (37, 1, 2, 'hobby', '爱好', 'My favorite hobby is reading.', '/ˈhɒb.i/ (hob-by) - bb 双写', 'Middle English hobi (小马)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (38, 1, 2, 'music', '音乐', 'I listen to music every day.', '/ˈmjuː.zɪk/ (mu-sic) - u 发 /juː/', 'Greek mousike (缪斯的艺术)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (39, 1, 2, 'game', '游戏', 'Let''s play a computer game.', '/ɡeɪm/ (game) - a-e 结构', 'Old English gamen (快乐)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (40, 1, 2, 'read', '阅读', 'I read a book before bed.', '/riːd/ (read) - ea 组合发 /iː/', 'Old English rædan (解释/建议)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (41, 1, 2, 'write', '写', 'Please write your name.', '/raɪt/ (write) - wr 组合 w 不发音', 'Old English writan (刻画)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (42, 1, 2, 'draw', '画画', 'Can you draw a cat?', '/drɔː/ (draw) - aw 发 /ɔː/', 'Old English dragan (拉/拖)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (43, 1, 2, 'paint', '绘画; 颜料', 'She likes to paint flowers.', '/peɪnt/ (paint) - ai 发 /ei/', 'Latin pingere', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (44, 1, 2, 'dance', '跳舞', 'They dance to the music.', '/dɑːns/ (dance) - ce 发 /s/', 'Old French dancier', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (45, 1, 2, 'sing', '唱歌', 'We sing songs in school.', '/sɪŋ/ (sing) - ng 鼻音', 'Old English singan', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (46, 1, 2, 'swim', '游泳', 'I can swim in the sea.', '/swɪm/ (swim) - sw 辅音连缀', 'Old English swimman', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (47, 1, 2, 'run', '跑步', 'He runs very fast.', '/rʌn/ (run) - 短元音 u', 'Old English rinnan', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (48, 1, 2, 'walk', '走路', 'I walk to school every day.', '/wɔːk/ (walk) - l 不发音', 'Old English wealcan (滚动)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (49, 1, 2, 'climb', '攀爬', 'Monkeys climb trees.', '/klaɪm/ (climb) - b 不发音', 'Old English climban', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (50, 1, 2, 'cook', '烹饪; 厨师', 'My dad cooks dinner.', '/kʊk/ (cook) - oo 发短音 /ʊ/', 'Latin coquus', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (51, 1, 2, 'camp', '露营', 'We camp in the forest.', '/kæmp/ (camp) - mp 结尾', 'Latin campus (田野)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (52, 1, 2, 'fish', '钓鱼; 鱼', 'He likes to fish in the river.', '/fɪʃ/ (fish) - sh 发 /ʃ/', 'Old English fisc', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (53, 1, 2, 'shop', '购物; 商店', 'I shop for clothes on Saturdays.', '/ʃɒp/ (shop) - sh 发 /ʃ/', 'Old English sceoppa (棚子)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (54, 1, 2, 'travel', '旅行', 'I want to travel to Spain.', '/ˈtræv.əl/ (trav-el)', 'Old French travailler (辛苦工作)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (55, 1, 2, 'collect', '收集', 'He collects old stamps.', '/kəˈlekt/ (col-lect)', 'Latin colligere (聚在一起)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (56, 1, 2, 'photo', '照片', 'This is a photo of my dog.', '/ˈfəʊ.təʊ/ (pho-to) - ph 发 /f/', 'Greek phos (光)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (57, 1, 2, 'camera', '照相机', 'I have a new digital camera.', '/ˈkæm.rə/ (cam-e-ra)', 'Latin camera (暗箱/房间)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (58, 1, 2, 'club', '俱乐部', 'I am in the tennis club.', '/klʌb/ (club) - 短元音 u', 'Old Norse klubba', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (59, 1, 2, 'member', '成员', 'He is a member of the team.', '/ˈmem.bə(r)/ (mem-ber)', 'Latin membrum (肢体/部分)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (60, 1, 2, 'party', '派对', 'It is my birthday party.', '/ˈpɑː.ti/ (par-ty) - ar 发 /ɑː/', 'Old French partie (部分/团体)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (61, 1, 2, 'newspaper', '报纸', 'My dad reads the newspaper.', '/ˈnjuːzˌpeɪ.pə(r)/', 'Compound: news + paper', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (62, 1, 2, 'magazine', '杂志', 'She buys a fashion magazine.', '/ˌmæɡ.əˈziːn/ (mag-a-zine)', 'Arabic makhāzin (仓库)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (63, 1, 2, 'daily', '每天的', 'I have a daily routine.', '/ˈdeɪ.li/ (dai-ly) - ai 发 /ei/', 'Root: day + ly', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (64, 1, 2, 'often', '经常', 'I often go to the park.', '/ˈɒf.n/ (of-ten) - t 常不发音', 'Old English oft', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (65, 1, 2, 'sometimes', '有时', 'Sometimes I watch TV.', '/ˈsʌm.taɪmz/', 'Compound: some + times', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (66, 1, 2, 'never', '从不', 'I never eat meat.', '/ˈnev.ə(r)/ (nev-er)', 'Old English næfre (not ever)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (67, 1, 2, 'watch', '观看; 手表', 'I watch TV in the evening.', '/wɒtʃ/ (watch) - tch 发 /tʃ/', 'Old English wæccan (保持警惕)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (68, 1, 2, 'listen', '听', 'Listen to the teacher.', '/ˈlɪs.n/ (lis-ten) - t 不发音', 'Old English hlysnan', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (69, 1, 2, 'screen', '屏幕', 'The computer screen is black.', '/skriːn/ (screen) - scr 连缀', 'Old French escren', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (70, 1, 2, 'video', '视频', 'We watched a funny video.', '/ˈvɪd.i.əʊ/ (vid-e-o)', 'Latin videre (看)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (71, 1, 3, 'apple', '苹果', 'I eat an apple every day.', '/ˈæp.l/ (ap-ple) - le 结尾', 'Old English æppel', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (72, 1, 3, 'banana', '香蕉', 'Monkeys love bananas.', '/bəˈnɑː.nə/ (ba-na-na)', 'West African origin', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (73, 1, 3, 'orange', '橙子', 'Would you like an orange?', '/ˈɒr.ɪndʒ/ (or-ange) - ge 发 /dʒ/', 'Sanskrit naranga', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (74, 1, 3, 'bread', '面包', 'I need to buy some bread.', '/bred/ (bread) - ea 发短音 /e/', 'Old English bread (碎屑)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (75, 1, 3, 'butter', '黄油', 'I put butter on my toast.', '/ˈbʌt.ə(r)/ (but-ter) - tt 双写', 'Greek bouturon (牛的奶酪)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (76, 1, 3, 'cheese', '奶酪', 'This pizza has a lot of cheese.', '/tʃiːz/ (cheese) - ee 发 /iː/', 'Latin caseus', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (77, 1, 3, 'egg', '鸡蛋', 'I had a boiled egg for breakfast.', '/eɡ/ (egg) - 短音 e', 'Old Norse egg', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (78, 1, 3, 'meat', '肉', 'She does not eat meat.', '/miːt/ (meat) - ea 发 /iː/', 'Old English mete (食物)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (79, 1, 3, 'chicken', '鸡肉; 鸡', 'We are having chicken.', '/ˈtʃɪk.ɪn/ (chick-en) - ck 发 /k/', 'Old English cicen', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (80, 1, 3, 'fish', '鱼肉', 'Fish is good for your health.', '/fɪʃ/ (fish) - sh 发 /ʃ/', 'Old English fisc', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (81, 1, 3, 'beef', '牛肉', 'I like roast beef.', '/biːf/ (beef) - ee 发 /iː/', 'Old French boef (公牛)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (82, 1, 3, 'fruit', '水果', 'You should eat more fruit.', '/fruːt/ (fruit) - ui 发 /uː/', 'Latin fructus (产物/享受)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (83, 1, 3, 'vegetable', '蔬菜', 'Carrots are vegetables.', '/ˈvedʒ.tə.bl/ (veg-ta-ble)', 'Latin vegetabilis (生长的)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (84, 1, 3, 'tomato', '西红柿', 'I like tomato soup.', '/təˈmɑː.təʊ/ (to-ma-to)', 'Nahuatl (Aztec) tomatl', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (85, 1, 3, 'potato', '土豆', 'Can you peel the potatoes?', '/pəˈteɪ.təʊ/ (po-ta-to)', 'Taino batata', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (86, 1, 3, 'carrot', '胡萝卜', 'Rabbits like carrots.', '/ˈkær.ət/ (car-rot) - rr 双写', 'Greek karoton', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (87, 1, 3, 'rice', '米饭', 'Chinese people eat rice.', '/raɪs/ (rice) - c 发 /s/', 'Old French ris', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (88, 1, 3, 'pasta', '意大利面', 'Italian pasta is delicious.', '/ˈpæs.tə/ (pas-ta)', 'Italian pasta (面团)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (89, 1, 3, 'soup', '汤', 'This hot soup is nice.', '/suːp/ (soup) - ou 发 /uː/', 'French soupe', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (90, 1, 3, 'cake', '蛋糕', 'I made a chocolate cake.', '/keɪk/ (cake) - a-e 结构', 'Old Norse kaka', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (91, 1, 3, 'chocolate', '巧克力', 'She loves milk chocolate.', '/ˈtʃɒk.lət/ (choc-late)', 'Nahuatl xocolatl', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (92, 1, 3, 'biscuit', '饼干', 'Want a biscuit with tea?', '/ˈbɪs.kɪt/ - u 不发音', 'Latin bis (两次) + coctus (烹饪)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (93, 1, 3, 'water', '水', 'Can I have some water?', '/ˈwɔː.tə(r)/ (wa-ter) - a 发 /ɔː/', 'Old English wæter', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (94, 1, 3, 'milk', '牛奶', 'I drink milk in the morning.', '/mɪlk/ (milk)', 'Old English meolc', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (95, 1, 3, 'juice', '果汁', 'Orange juice is sweet.', '/dʒuːs/ (juice) - ui 发 /uː/', 'Latin jus (肉汤/酱汁)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (96, 1, 3, 'tea', '茶', 'The British drink tea.', '/tiː/ (tea) - ea 发 /iː/', 'Chinese te (闽南语“茶”)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (97, 1, 3, 'coffee', '咖啡', 'Dad drinks coffee.', '/ˈkɒf.i/ (cof-fee) - ff/ee 双写', 'Arabic qahwah', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (98, 1, 3, 'bottle', '瓶子', 'A bottle of water.', '/ˈbɒt.l/ (bot-tle) - le 结尾', 'Late Latin buttis (酒桶)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (99, 1, 3, 'cup', '杯子', 'A cup of tea.', '/kʌp/ (cup) - 短音 u', 'Latin cuppa', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (100, 1, 3, 'glass', '玻璃杯', 'Be careful with that glass.', '/ɡlɑːs/ (glass) - ss 结尾', 'Old English glæs', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (101, 1, 3, 'plate', '盘子', 'Put the cake on a plate.', '/pleɪt/ (plate) - a-e 结构', 'Old French plat (平坦的)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (102, 1, 3, 'restaurant', '餐厅', 'We ate at a restaurant.', '/ˈres.trɒnt/ (res-tau-rant)', 'French restaurer (恢复体力)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (103, 1, 3, 'cafe', '咖啡馆', 'Let''s meet at the cafe.', '/ˈkæf.eɪ/ (caf-e)', 'French café', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (104, 1, 3, 'menu', '菜单', 'Can I see the menu?', '/ˈmen.juː/ (men-u)', 'French menu (详细列表)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (105, 1, 3, 'picnic', '野餐', 'We had a picnic in the park.', '/ˈpɪk.nɪk/ (pic-nic)', 'French pique-nique', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (106, 1, 3, 'sandwich', '三明治', 'I had a sandwich for lunch.', '/ˈsæn.wɪdʒ/ - d 常不发音', 'Earl of Sandwich (人名)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (107, 1, 3, 'breakfast', '早餐', 'I eat breakfast at 7 am.', '/ˈbrek.fəst/ - break 发 /brek/', 'Break (打破) + fast (禁食)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (108, 1, 3, 'lunch', '午餐', 'We have lunch at school.', '/lʌntʃ/ (lunch)', 'Origin uncertain', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (109, 1, 3, 'dinner', '晚餐', 'Dinner is at 6 pm.', '/ˈdɪn.ə(r)/ (din-ner)', 'Old French disner', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (110, 1, 4, 'school', '学校', 'I go to school by bus.', '/skuːl/ (school) - ch 发 /k/', 'Greek skhole (闲暇/讨论)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (111, 1, 4, 'teacher', '老师', 'The teacher is kind.', '/ˈtiː.tʃə(r)/ (teach-er)', 'Old English tæcan (教) + er', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (112, 1, 4, 'student', '学生', 'The student studies hard.', '/ˈstjuː.dent/ (stu-dent)', 'Latin studere (勤奋)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (113, 1, 4, 'class', '班级; 课', 'I have an English class.', '/klɑːs/ (class)', 'Latin classis (召集/阶级)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (114, 1, 4, 'classroom', '教室', 'The classroom is big.', '/ˈklɑːs.ruːm/', 'Compound: class + room', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (115, 1, 4, 'desk', '书桌', 'My book is on the desk.', '/desk/ (desk)', 'Latin discus (圆盘/桌子)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (116, 1, 4, 'board', '黑板/白板', 'Look at the board.', '/bɔːd/ (board) - oar 发 /ɔː/', 'Old English bord (木板)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (117, 1, 4, 'book', '书', 'I love reading books.', '/bʊk/ (book) - oo 发短音', 'Old English boc', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (118, 1, 4, 'notebook', '笔记本', 'Write it in your notebook.', '/ˈnəʊt.bʊk/', 'Compound: note + book', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (119, 1, 4, 'pen', '钢笔', 'Can I borrow a pen?', '/pen/ (pen)', 'Latin penna (羽毛)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (120, 1, 4, 'pencil', '铅笔', 'Use a pencil to draw.', '/ˈpen.sl/ (pen-cil)', 'Latin penicillus (小尾巴/画笔)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (121, 1, 4, 'rubber', '橡皮', 'I need a rubber.', '/ˈrʌb.ə(r)/ (rub-ber)', 'From verb rub (擦)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (122, 1, 4, 'ruler', '尺子', 'Measure it with a ruler.', '/ˈruː.lə(r)/ (ru-ler)', 'Old French riule', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (123, 1, 4, 'lesson', '课程', 'The math lesson is hard.', '/ˈles.n/ (les-son)', 'Latin lectio (阅读/诵读)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (124, 1, 4, 'subject', '科目', 'My favorite subject is art.', '/ˈsʌb.dʒekt/ (sub-ject)', 'Latin sub (下) + jacere (扔)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (125, 1, 4, 'homework', '家庭作业', 'I do homework at night.', '/ˈhəʊm.wɜːk/', 'Compound: home + work', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (126, 1, 4, 'exam', '考试', 'I passed the exam.', '/ɪɡˈzæm/ (ex-am)', 'Latin examen (称重/衡量)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (127, 1, 4, 'test', '测验', 'We have a spelling test.', '/test/ (test)', 'Latin testu (试金石)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (128, 1, 4, 'university', '大学', 'She goes to university.', '/ˌjuː.nɪˈvɜː.sə.ti/', 'Latin universitas (整体/宇宙)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (129, 1, 4, 'college', '学院', 'He is at college.', '/ˈkɒl.ɪdʒ/ (col-lege)', 'Latin collegium (社团)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (130, 1, 4, 'course', '课程 (一门)', 'I am taking a course.', '/kɔːs/ (course) - our 发 /ɔː/', 'Latin cursus (跑道/过程)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (131, 1, 4, 'dictionary', '字典', 'Use a dictionary.', '/ˈdɪk.ʃən.ri/ (dic-tion-a-ry)', 'Latin dictio (说话/措辞)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (132, 1, 4, 'computer', '电脑', 'I use a computer.', '/kəmˈpjuː.tə(r)/', 'Latin computare (计算)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (133, 1, 4, 'internet', '互联网', 'Look on the internet.', '/ˈɪn.tə.net/', 'Prefix inter- (之间) + net', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (134, 1, 4, 'library', '图书馆', 'Quiet in the library.', '/ˈlaɪ.brər.i/ (li-brar-y)', 'Latin liber (书)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (135, 1, 4, 'project', '项目', 'We have a science project.', '/ˈprɒdʒ.ekt/ (proj-ect)', 'Latin pro (向前) + jacere (扔)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (136, 1, 4, 'study', '学习 (动作)', 'I study English daily.', '/ˈstʌd.i/ (stud-y)', 'Latin studium (热诚)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (137, 1, 4, 'learn', '学习 (学会)', 'I want to learn Spanish.', '/lɜːn/ (learn) - ear 发 /ɜː/', 'Old English leornian', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (138, 1, 4, 'history', '历史', 'History is interesting.', '/ˈhɪs.tr.i/ (his-to-ry)', 'Greek historia (探究)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (139, 1, 4, 'science', '科学', 'Science explains nature.', '/ˈsaɪ.əns/ (sci-ence) - sc 发 /s/', 'Latin scientia (知识)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (140, 1, 4, 'art', '艺术', 'I like painting in art.', '/ɑːt/ (art)', 'Latin ars (技巧)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (141, 1, 4, 'geography', '地理', 'We learn about maps in geography.', '/dʒiˈɒɡ.rə.fi/', 'Greek geo (地) + graphy (写)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (142, 1, 4, 'biology', '生物', 'Biology is the study of life.', '/baɪˈɒl.ə.dʒi/', 'Greek bios (生命) + logy (学科)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (143, 1, 4, 'mathematics', '数学', 'Mathematics is about numbers.', '/ˌmæθˈmæt.ɪks/', 'Greek mathema (知识)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (144, 1, 4, 'maths', '数学 (口语)', 'I am good at maths.', '/mæθs/ (maths)', 'Short for mathematics', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (145, 1, 5, 'car', '汽车', 'We went there by car.', '/kɑː(r)/ (car)', 'Latin carrus (四轮马车)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (146, 1, 5, 'bus', '公共汽车', 'The bus is late.', '/bʌs/ (bus)', 'Short for omnibus (为所有人的)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (147, 1, 5, 'train', '火车', 'The train is fast.', '/treɪn/ (train) - ai 发 /ei/', 'Old French trainer (拖/拉)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (148, 1, 5, 'plane', '飞机', 'The plane flies high.', '/pleɪn/ (plane) - a-e 结构', 'Latin planus (平坦的-指机翼)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (149, 1, 5, 'bike', '自行车', 'I ride my bike.', '/baɪk/ (bike) - i-e 结构', 'Short for bicycle', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (150, 1, 5, 'bicycle', '自行车', 'A bicycle has two wheels.', '/ˈbaɪ.sɪ.kl/ (bi-cy-cle)', 'Bi (二) + cycle (轮)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (151, 1, 5, 'boat', '船', 'We sailed the boat.', '/bəʊt/ (boat) - oa 发 /əʊ/', 'Old English bat', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (152, 1, 5, 'ship', '轮船', 'The ship is on the sea.', '/ʃɪp/ (ship)', 'Old English scip', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (153, 1, 5, 'taxi', '出租车', 'Take a taxi home.', '/ˈtæk.si/ (tax-i)', 'Short for taximeter (计价器)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (154, 1, 5, 'ticket', '票', 'I have a bus ticket.', '/ˈtɪk.ɪt/ (tick-et)', 'Old French estiquet (标签)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (155, 1, 5, 'airport', '机场', 'We are at the airport.', '/ˈeə.pɔːt/', 'Compound: air + port (港口)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (156, 1, 5, 'station', '车站', 'Meet me at the station.', '/ˈsteɪ.ʃn/ (sta-tion)', 'Latin statio (站立的地方)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (157, 1, 5, 'stop', '站点', 'Get off at the next stop.', '/stɒp/ (stop)', 'Old English stoppian', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (158, 1, 5, 'street', '街道', 'The street is busy.', '/striːt/ (street) - ee 发 /iː/', 'Latin strata (铺过的路)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (159, 1, 5, 'road', '道路', 'Cross the road carefully.', '/rəʊd/ (road) - oa 发 /əʊ/', 'Old English rad (骑行)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (160, 1, 5, 'bridge', '桥', 'Walk across the bridge.', '/brɪdʒ/ (bridge) - dge 发 /dʒ/', 'Old English brycg', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (161, 1, 5, 'hotel', '酒店', 'The hotel is nice.', '/həʊˈtel/ (ho-tel)', 'French hôtel', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (162, 1, 5, 'museum', '博物馆', 'Visit the museum.', '/mjuˈziː.əm/ (mu-se-um)', 'Greek mouseion (缪斯的座位)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (163, 1, 5, 'park', '公园', 'Play in the park.', '/pɑːk/ (park)', 'Old French parc (围场)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (164, 1, 5, 'city', '城市', 'London is a big city.', '/ˈsɪt.i/ (cit-y) - c 发 /s/', 'Latin civitas (公民身份)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (165, 1, 5, 'town', '城镇', 'I live in a small town.', '/taʊn/ (town) - ow 发 /aʊ/', 'Old English tun (围墙/村落)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (166, 1, 5, 'village', '村庄', 'It is a quiet village.', '/ˈvɪl.ɪdʒ/ (vil-lage)', 'Latin villa (农庄)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (167, 1, 5, 'country', '国家; 乡村', 'I love my country.', '/ˈkʌn.tri/ (coun-try)', 'Latin contra (对面的土地)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (168, 1, 5, 'map', '地图', 'Look at the map.', '/mæp/ (map)', 'Latin mappa (餐巾/布)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (169, 1, 5, 'trip', '旅行 (短途)', 'Have a good trip!', '/trɪp/ (trip)', 'Dutch trippen (轻快地走)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (170, 1, 5, 'holiday', '假期', 'I am on holiday.', '/ˈhɒl.ə.deɪ/ (hol-i-day)', 'Old English halig (神圣) + dæg', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (171, 1, 5, 'passport', '护照', 'Show your passport.', '/ˈpɑːs.pɔːt/', 'French passeport (通过港口)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (172, 1, 5, 'luggage', '行李', 'My luggage is heavy.', '/ˈlʌɡ.ɪdʒ/ (lug-gage)', 'Verb lug (拖拽) + age', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (173, 1, 5, 'fly', '飞', 'Birds can fly.', '/flaɪ/ (fly) - y 发 /aɪ/', 'Old English fleogan', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (174, 1, 5, 'drive', '驾驶', 'Drive carefully.', '/draɪv/ (drive) - i-e 结构', 'Old English drifan', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (175, 1, 5, 'ride', '骑', 'Ride a bike.', '/raɪd/ (ride) - i-e 结构', 'Old English ridan', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (176, 1, 5, 'tourist', '游客', 'Many tourists visit here.', '/ˈtʊə.rɪst/ (tour-ist)', 'Tour + ist (人)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (177, 1, 5, 'journey', '旅程', 'It is a long journey.', '/ˈdʒɜː.ni/ (jour-ney)', 'Old French jurnee (一天的路程/工作)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (178, 1, 5, 'crossing', '十字路口; 斑马线', 'Use the crossing.', '/ˈkrɒs.ɪŋ/', 'Verb cross + ing', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (179, 1, 5, 'roundabout', '环岛', 'Turn left at the roundabout.', '/ˈraʊnd.ə.baʊt/', 'Compound: round + about', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (180, 1, 5, 'ambulance', '救护车', 'The ambulance is fast.', '/ˈæm.bjə.ləns/', 'Latin ambulare (行走-流动医院)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (181, 1, 6, 'job', '工作', 'He has a new job.', '/dʒɒb/ (job)', 'Origin unknown (16th C)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (182, 1, 6, 'work', '工作 (动作/地点)', 'I work at a bank.', '/wɜːk/ (work) - or 发 /ɜː/', 'Old English weorc', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (183, 1, 6, 'boss', '老板', 'My boss is nice.', '/bɒs/ (boss)', 'Dutch baas (主人)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (184, 1, 6, 'doctor', '医生', 'See a doctor.', '/ˈdɒk.tə(r)/ (doc-tor)', 'Latin docere (教导)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (185, 1, 6, 'nurse', '护士', 'The nurse helped me.', '/nɜːs/ (nurse) - ur 发 /ɜː/', 'Latin nutrire (哺乳/抚养)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (186, 1, 6, 'teacher', '老师', 'Ask the teacher.', '/ˈtiː.tʃə(r)/ (teach-er)', 'Verb teach + er', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (187, 1, 6, 'driver', '司机', 'He is a bus driver.', '/ˈdraɪ.və(r)/ (driv-er)', 'Verb drive + er', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (188, 1, 6, 'cook', '厨师', 'He is a good cook.', '/kʊk/ (cook) - oo 发 /ʊ/', 'Latin coquus', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (189, 1, 6, 'chef', '主厨', 'The chef cooks food.', '/ʃef/ (chef) - ch 发 /ʃ/', 'French chef (首领)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (190, 1, 6, 'waiter', '服务员 (男)', 'The waiter is busy.', '/ˈweɪ.tə(r)/ (wait-er)', 'Verb wait + er', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (191, 1, 6, 'waitress', '服务员 (女)', 'The waitress served tea.', '/ˈweɪ.trəs/ (wait-ress)', 'Waiter + ess (女性后缀)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (192, 1, 6, 'farmer', '农民', 'The farmer grows corn.', '/ˈfɑː.ma(r)/ (farm-er)', 'Verb farm + er', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (193, 1, 6, 'mechanic', '技工', 'The mechanic fixed the car.', '/məˈkæn.ɪk/ - ch 发 /k/', 'Greek mekhane (机器)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (194, 1, 6, 'engineer', '工程师', 'An engineer builds roads.', '/ˌen.dʒɪˈnɪə(r)/', 'Latin ingenium (才智/引擎)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (195, 1, 6, 'artist', '艺术家', 'The artist paints.', '/ˈɑː.tɪst/ (art-ist)', 'Art + ist', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (196, 1, 6, 'actor', '演员', 'He is a movie actor.', '/ˈæk.tə(r)/ (ac-tor)', 'Latin agere (做/表演)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (197, 1, 6, 'police', '警察', 'Call the police.', '/pəˈliːs/ (po-lice)', 'Greek politeia (公民管理)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (198, 1, 6, 'soldier', '士兵', 'The soldier is brave.', '/ˈsəʊl.dʒə(r)/ (sol-dier)', 'Latin solidus (金币-领军饷者)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (199, 1, 6, 'business', '生意; 商业', 'Business is good.', '/ˈbɪz.nɪs/ - u 发 /ɪ/', 'Busy + ness', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (200, 1, 6, 'company', '公司', 'A big tech company.', '/ˈkʌm.pə.ni/ (com-pa-ny)', 'Old French compagnie', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (201, 1, 6, 'office', '办公室', 'I go to the office.', '/ˈɒf.ɪs/ (of-fice)', 'Latin officium (职责)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (202, 1, 6, 'factory', '工厂', 'A car factory.', '/ˈfæk.tri/ (fac-to-ry)', 'Latin factor (制造者)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (203, 1, 6, 'guide', '导游', 'The guide showed us.', '/ɡaɪd/ (guide) - u 不发音', 'Old French guider', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (204, 1, 6, 'cleaner', '清洁工', 'The cleaner is here.', '/ˈkliː.nə(r)/ (clean-er)', 'Verb clean + er', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (205, 1, 6, 'journalist', '记者', 'A journalist writes news.', '/ˈdʒɜː.nə.lɪst/', 'Journal + ist', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (206, 1, 6, 'pilot', '飞行员', 'The pilot flies the plane.', '/ˈpaɪ.lət/ (pi-lot)', 'Italian pilota', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (207, 1, 6, 'dentist', '牙医', 'Go to the dentist.', '/ˈden.tɪst/ (den-tist)', 'Latin dens (牙齿)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (208, 1, 6, 'manager', '经理', 'Speak to the manager.', '/ˈmæn.ɪ.dʒə(r)/', 'Italian maneggiare (处理/用手)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (209, 1, 6, 'secretary', '秘书', 'The secretary typed a letter.', '/ˈsek.rə.tri/ (sec-re-ta-ry)', 'Latin secretum (秘密-保守秘密的人)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (210, 1, 6, 'shop assistant', '店员', 'The shop assistant helped me.', '/ʃɒp əˈsɪs.tənt/', '复合短语', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (211, 1, 7, 'house', '房子 (独栋)', 'I live in a big house.', '/haʊs/ (house) - ou 发 /aʊ/', 'Old English hus', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (212, 1, 7, 'home', '家', 'I am going home.', '/həʊm/ (home) - o-e 结构', 'Old English ham', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (213, 1, 7, 'apartment', '公寓', 'My apartment is small.', '/əˈpɑːt.mənt/', 'Italian appartamento (分开的房间)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (214, 1, 7, 'flat', '公寓 (英式)', 'She lives in a flat.', '/flæt/ (flat)', 'Old English flet (地板/住所)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (215, 1, 7, 'room', '房间', 'This is my room.', '/ruːm/ (room) - oo 发 /uː/', 'Old English rum (空间)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (216, 1, 7, 'bedroom', '卧室', 'I sleep in my bedroom.', '/ˈbed.ruːm/', 'Compound: bed + room', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (217, 1, 7, 'bathroom', '浴室', 'Where is the bathroom?', '/ˈbɑːθ.ruːm/', 'Compound: bath + room', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (218, 1, 7, 'living room', '起居室; 客厅', 'We watch TV in the living room.', '/ˈlɪv.ɪŋ ruːm/', 'Living (生活) + room', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (219, 1, 7, 'kitchen', '厨房', 'Mom is in the kitchen.', '/ˈkɪtʃ.ɪn/ (kitch-en)', 'Latin coquina (烹饪的地方)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (220, 1, 7, 'garden', '花园', 'Flowers grow in the garden.', '/ˈɡɑː.dn/ (gar-den)', 'Old French jardin', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (221, 1, 7, 'door', '门', 'Open the door.', '/dɔː(r)/ (door) - oor 发 /ɔː/', 'Old English duru', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (222, 1, 7, 'window', '窗户', 'Close the window.', '/ˈwɪn.dəʊ/ (win-dow)', 'Old Norse vindauga (风眼)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (223, 1, 7, 'wall', '墙', 'Pictures are on the wall.', '/wɔːl/ (wall) - all 发 /ɔːl/', 'Latin vallum (防御墙)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (224, 1, 7, 'floor', '地板; 楼层', 'Sit on the floor.', '/flɔː(r)/ (floor) - oor 发 /ɔː/', 'Old English flor', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (225, 1, 7, 'roof', '屋顶', 'The roof is red.', '/ruːf/ (roof)', 'Old English hrof', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (226, 1, 7, 'furniture', '家具 (不可数)', 'We need new furniture.', '/ˈfɜː.nɪ.tʃə(r)/', 'French fournir (装备/提供)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (227, 1, 7, 'bed', '床', 'Go to bed.', '/bed/ (bed)', 'Old English bedd', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (228, 1, 7, 'chair', '椅子', 'Sit on the chair.', '/tʃeə(r)/ (chair) - air 发 /eə/', 'Old French chaiere', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (229, 1, 7, 'table', '桌子', 'Dinner is on the table.', '/ˈteɪ.bl/ (ta-ble)', 'Latin tabula (板)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (230, 1, 7, 'sofa', '沙发', 'Relax on the sofa.', '/ˈsəʊ.fə/ (so-fa)', 'Arabic suffah (长凳)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (231, 1, 7, 'cupboard', '橱柜', 'Plates are in the cupboard.', '/ˈkʌb.əd/ - p 不发音', 'Compound: cup + board', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (232, 1, 7, 'shelf', '架子', 'Put the book on the shelf.', '/ʃelf/ (shelf)', 'Low German schelf', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (233, 1, 7, 'lamp', '灯', 'Turn on the lamp.', '/læmp/ (lamp)', 'Greek lampas (火炬)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (234, 1, 7, 'clock', '钟', 'Look at the clock.', '/klɒk/ (clock) - ck 发 /k/', 'Latin clocca (铃)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (235, 1, 7, 'mirror', '镜子', 'Look in the mirror.', '/ˈmɪr.ə(r)/ (mir-ror)', 'Latin mirari (惊叹/看)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (236, 1, 7, 'shower', '淋浴', 'I take a shower daily.', '/ˈʃaʊ.ə(r)/ (show-er)', 'Old English scur', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (237, 1, 7, 'toilet', '厕所; 马桶', 'Where is the toilet?', '/ˈtɔɪ.lət/ (toi-let)', 'French toilette (布)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (238, 1, 7, 'fridge', '冰箱', 'Milk is in the fridge.', '/frɪdʒ/ (fridge)', 'Short for refrigerator', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (239, 1, 7, 'stairs', '楼梯', 'Go up the stairs.', '/steəz/ (stairs)', 'Old English stæger (攀登)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (240, 1, 7, 'key', '钥匙', 'I lost my key.', '/kiː/ (key) - ey 发 /iː/', 'Old English cæg', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (241, 1, 8, 'body', '身体', 'Exercise moves your body.', '/ˈbɒd.i/ (bod-y)', 'Old English bodig', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (242, 1, 8, 'head', '头', 'Wear a hat on your head.', '/hed/ (head) - ea 发 /e/', 'Old English heafod', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (243, 1, 8, 'eye', '眼睛', 'Close your eyes.', '/aɪ/ (eye) - 同音词 I', 'Old English eage', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (244, 1, 8, 'nose', '鼻子', 'I can smell with my nose.', '/nəʊz/ (nose) - s 发 /z/', 'Old English nosu', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (245, 1, 8, 'mouth', '嘴巴', 'Open your mouth.', '/maʊθ/ (mouth) - th 清辅音', 'Old English muth', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (246, 1, 8, 'tooth', '牙齿 (单)', 'I have a sore tooth.', '/tuːθ/ (tooth) - oo 长音', 'Old English toth', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (247, 1, 8, 'teeth', '牙齿 (复)', 'Brush your teeth.', '/tiːθ/ (teeth) - ee 长音', '不规则复数', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (248, 1, 8, 'ear', '耳朵', 'Listen with your ears.', '/ɪə(r)/ (ear)', 'Old English eare', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (249, 1, 8, 'hand', '手', 'Wash your hands.', '/hænd/ (hand)', 'Old English hand', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (250, 1, 8, 'arm', '手臂', 'He hurt his arm.', '/ɑːm/ (arm)', 'Old English earm', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (251, 1, 8, 'leg', '腿', 'My legs are tired.', '/leɡ/ (leg)', 'Old Norse leggr', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (252, 1, 8, 'foot', '脚 (单)', 'My foot hurts.', '/fʊt/ (foot) - oo 短音', 'Old English fot', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (253, 1, 8, 'feet', '脚 (复)', 'Stand on your feet.', '/fiːt/ (feet)', '不规则复数', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (254, 1, 8, 'back', '背部', 'My back aches.', '/bæk/ (back)', 'Old English bæc', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (255, 1, 8, 'hair', '头发', 'She has long hair.', '/heə(r)/ (hair)', 'Old English hær', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (256, 1, 8, 'face', '脸', 'Wash your face.', '/feɪs/ (face) - c 发 /s/', 'Latin facies', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (257, 1, 8, 'sick', '生病的', 'I feel sick.', '/sɪk/ (sick)', 'Old English seoc', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (258, 1, 8, 'ill', '不舒服的', 'He is ill in bed.', '/ɪl/ (ill)', 'Old Norse illr (坏的)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (259, 1, 8, 'well', '健康的; 好的', 'I feel very well.', '/wel/ (well)', 'Old English wel', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (260, 1, 8, 'hospital', '医院', 'Go to the hospital.', '/ˈhɒs.pɪ.tl/ (hos-pi-tal)', 'Latin hospes (客人)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (261, 1, 8, 'medicine', '药', 'Take this medicine.', '/ˈmed.sn/ (med-i-cine)', 'Latin medicina', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (262, 1, 8, 'doctor', '医生', 'The doctor helped me.', '/ˈdɒk.tə(r)/', 'Latin docere (教)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (263, 1, 8, 'happy', '快乐', 'I am so happy.', '/ˈhæp.i/ (hap-py)', 'Old Norse happ (运气)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (264, 1, 8, 'sad', '伤心', 'Don''t be sad.', '/sæd/ (sad)', 'Old English sæd (满足/沉重)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (265, 1, 8, 'angry', '生气', 'Why are you angry?', '/ˈæŋ.ɡri/ (an-gry)', 'Old Norse angr (悲伤)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (266, 1, 8, 'tired', '累', 'I am tired after work.', '/taɪəd/ (tired)', 'Old English teorian', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (267, 1, 8, 'hungry', '饿', 'I am hungry for lunch.', '/ˈhʌŋ.ɡri/ (hun-gry)', 'Old English hungrig', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (268, 1, 8, 'thirsty', '渴', 'I am thirsty for water.', '/ˈθɜː.sti/ (thirs-ty)', 'Old English thurstig', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (269, 1, 8, 'cold', '冷', 'I feel cold.', '/kəʊld/ (cold)', 'Old English ceald', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (270, 1, 8, 'hot', '热', 'I am too hot.', '/hɒt/ (hot)', 'Old English hat', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (271, 1, 8, 'pain', '疼痛', 'I have a pain in my leg.', '/peɪn/ (pain)', 'Latin poena (惩罚)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (272, 1, 9, 'clothes', '衣服 (复数)', 'Put on your clothes.', '/kləʊðz/ - th 发浊音', 'Old English clathas', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (273, 1, 9, 'shirt', '衬衫', 'A white shirt.', '/ʃɜːt/ (shirt) - ir 发 /ɜː/', 'Old English scyrte', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (274, 1, 9, 't-shirt', 'T恤', 'I wear a t-shirt.', '/ˈtiː.ʃɜːt/', '形状像字母 T', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (275, 1, 9, 'trousers', '裤子', 'My trousers are blue.', '/ˈtraʊ.zəz/ - ou 发 /aʊ/', 'Gaelic triubhas', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (276, 1, 9, 'jeans', '牛仔裤', 'I like wearing jeans.', '/dʒiːnz/ (jeans)', '来自意大利城市热那亚 (Genoa)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (277, 1, 9, 'shorts', '短裤', 'It is hot, wear shorts.', '/ʃɔːts/ (shorts)', 'Adjective short + s', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (278, 1, 9, 'skirt', '裙子 (半身)', 'She has a red skirt.', '/skɜːt/ (skirt)', 'Old Norse skyrta', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (279, 1, 9, 'dress', '连衣裙', 'A beautiful dress.', '/dres/ (dress)', 'Old French dresser (整理)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (280, 1, 9, 'shoe', '鞋子', 'Where is my shoe?', '/ʃuː/ (shoe)', 'Old English scoh', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (281, 1, 9, 'boot', '靴子', 'Wear boots in winter.', '/buːt/ (boot)', 'Old French bote', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (282, 1, 9, 'coat', '外套', 'Put on your coat.', '/kəʊt/ (coat) - oa 发 /əʊ/', 'Old French cote', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (283, 1, 9, 'jacket', '夹克', 'Take a jacket.', '/ˈdʒæk.ɪt/ (jack-et)', 'Old French jacquet', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (284, 1, 9, 'hat', '帽子', 'Wear a hat.', '/hæt/ (hat)', 'Old English hætt', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (285, 1, 9, 'cap', '鸭舌帽', 'A baseball cap.', '/kæp/ (cap)', 'Latin cappa (头巾)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (286, 1, 9, 'scarf', '围巾', 'A warm wool scarf.', '/skɑːf/ (scarf)', 'Old French escharpe', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (287, 1, 9, 'glove', '手套', 'Wear gloves in snow.', '/ɡlʌv/ (glove) - o 发 /ʌ/', 'Old English glof', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (288, 1, 9, 'sock', '袜子', 'Put on your socks.', '/sɒk/ (sock)', 'Latin soccus (轻便鞋)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (289, 1, 9, 'glasses', '眼镜', 'I need my glasses.', '/ˈɡlɑːs.ɪz/ (glass-es)', 'Plural of glass', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (290, 1, 9, 'sunglasses', '太阳镜', 'Wear sunglasses in sun.', '/ˈsʌnˌɡlɑːs.ɪz/', 'Sun + glasses', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (291, 1, 9, 'watch', '手表', 'Check the time on your watch.', '/wɒtʃ/ (watch)', 'Old English wæccan', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (292, 1, 9, 'bag', '包', 'Pack your school bag.', '/bæɡ/ (bag)', 'Old Norse baggi', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (293, 1, 9, 'pocket', '口袋', 'Put it in your pocket.', '/ˈpɒk.ɪt/ (pock-et)', 'Old French pokete', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (294, 1, 9, 'wallet', '钱包 (男式)', 'I lost my wallet.', '/ˈwɒl.ɪt/ (wal-let)', 'Proto-Germanic wall (滚动)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (295, 1, 9, 'purse', '钱包 (女式)', 'She has a coin in her purse.', '/pɜːs/ (purse)', 'Latin bursa (皮囊)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (296, 1, 9, 'jewellery', '珠宝', 'Gold jewellery is expensive.', '/ˈdʒuː.əl.ri/ (jew-el-ry)', 'Old French jouel', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (297, 1, 9, 'ring', '戒指', 'A gold wedding ring.', '/rɪŋ/ (ring)', 'Old English hring', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (298, 1, 9, 'umbrella', '雨伞', 'Take an umbrella.', '/ʌmˈbrel.ə/ (um-brel-la)', 'Latin umbra (阴影)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (299, 1, 10, 'weather', '天气', 'The weather is nice.', '/ˈweð.ə(r)/ - th 浊音', 'Old English weder', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (300, 1, 10, 'sun', '太阳', 'The sun shines.', '/sʌn/ (sun)', 'Old English sunne', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (301, 1, 10, 'sunny', '晴朗的', 'A sunny day.', '/ˈsʌn.i/ (sun-ny)', 'Noun sun + y', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (302, 1, 10, 'rain', '雨', 'It is going to rain.', '/reɪn/ (rain) - ai 发 /ei/', 'Old English regn', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (303, 1, 10, 'rainy', '下雨的', 'A rainy afternoon.', '/ˈreɪ.ni/ (rain-y)', 'Noun rain + y', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (304, 1, 10, 'cloud', '云', 'A white cloud.', '/klaʊd/ (cloud) - ou 发 /aʊ/', 'Old English clud (岩石)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (305, 1, 10, 'cloudy', '多云的', 'It is cloudy today.', '/ˈklaʊ.di/ (cloud-y)', 'Noun cloud + y', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (306, 1, 10, 'wind', '风', 'The wind blows.', '/wɪnd/ (wind)', 'Old English wind', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (307, 1, 10, 'windy', '多风的', 'A windy beach.', '/ˈwɪn.di/ (wind-y)', 'Noun wind + y', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (308, 1, 10, 'snow', '雪', 'Snow is cold.', '/snəʊ/ (snow) - ow 发 /əʊ/', 'Old English snaw', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (309, 1, 10, 'storm', '暴风雨', 'A big storm is coming.', '/stɔːm/ (storm)', 'Old English storm', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (310, 1, 10, 'fog', '雾', 'I can''t see in the fog.', '/fɒɡ/ (fog)', 'Danish fog (喷射)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (311, 1, 10, 'ice', '冰', 'There is ice on the road.', '/aɪs/ (ice) - i-e 结构', 'Old English is', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (312, 1, 10, 'sky', '天空', 'The sky is blue.', '/skaɪ/ (sky) - y 发 /aɪ/', 'Old Norse sky (云)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (313, 1, 10, 'star', '星星', 'Look at the stars.', '/stɑː(r)/ (star)', 'Old English steorra', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (314, 1, 10, 'moon', '月亮', 'The moon is full.', '/muːn/ (moon)', 'Old English mona', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (315, 1, 10, 'tree', '树', 'Climb a tree.', '/triː/ (tree)', 'Old English treow', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (316, 1, 10, 'flower', '花', 'A red flower.', '/ˈflaʊ.ə(r)/ (flow-er)', 'Latin flos', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (317, 1, 10, 'grass', '草', 'Sit on the grass.', '/ɡrɑːs/ (grass)', 'Old English græs', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (318, 1, 10, 'river', '河流', 'Fish in the river.', '/ˈrɪv.ə(r)/ (riv-er)', 'Latin ripa (河岸)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (319, 1, 10, 'sea', '大海', 'Swim in the sea.', '/siː/ (sea) - ea 发 /iː/', 'Old English sæ', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (320, 1, 10, 'beach', '海滩', 'Play on the beach.', '/biːtʃ/ (beach) - ea 发 /iː/', 'Old English bæce', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (321, 1, 10, 'mountain', '山', 'Climb the mountain.', '/ˈmaʊn.tɪn/ (moun-tain)', 'Latin mons', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (322, 1, 10, 'forest', '森林', 'Trees in the forest.', '/ˈfɒr.ɪst/ (for-est)', 'Latin forestis (外面的树林)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (323, 1, 10, 'animal', '动物', 'Dogs are animals.', '/ˈæn.ɪ.məl/ (an-i-mal)', 'Latin anima (呼吸/灵魂)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (324, 1, 10, 'spring', '春天', 'Flowers bloom in spring.', '/sprɪŋ/ (spring)', 'Old English springan (涌出)', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (325, 1, 10, 'summer', '夏天', 'It is hot in summer.', '/ˈsʌm.ə(r)/ (sum-mer)', 'Old English sumor', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (326, 1, 10, 'autumn', '秋天', 'Leaves fall in autumn.', '/ˈɔː.təm/ (au-tumn) - n 不发音', 'Latin autumnus', NULL, 1);
INSERT OR IGNORE INTO words (id, tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty) VALUES (327, 1, 10, 'winter', '冬天', 'It is cold in winter.', '/ˈwɪn.tə(r)/ (win-ter)', 'Old English winter', NULL, 1);
