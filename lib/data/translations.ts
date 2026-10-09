import { LANGUAGES } from "./languages";

export type Language = (typeof LANGUAGES)[number]["value"];

export const VOTE_LABELS: Record<
  Language,
  { bull: string; bear: string; vote: string; voting: string }
> = {
  en: { bull: "Bull", bear: "Bear", vote: "Vote", voting: "Voting..." },
  ko: { bull: "상승", bear: "하락", vote: "투표", voting: "투표 중..." },
  ja: { bull: "上昇", bear: "下落", vote: "投票", voting: "投票中..." },
  zh: { bull: "看涨", bear: "看跌", vote: "投票", voting: "投票中..." },
  de: {
    bull: "Steigt",
    bear: "Fällt",
    vote: "Abstimmen",
    voting: "Wird gesendet...",
  },
  fr: {
    bull: "Hausse",
    bear: "Baisse",
    vote: "Voter",
    voting: "Envoi en cours...",
  },
  es: { bull: "Sube", bear: "Baja", vote: "Votar", voting: "Enviando..." },
  pt: { bull: "Sobe", bear: "Cai", vote: "Votar", voting: "Enviando..." },
  it: {
    bull: "Sale",
    bear: "Scende",
    vote: "Vota",
    voting: "Invio in corso...",
  },
  ru: {
    bull: "Рост",
    bear: "Падение",
    vote: "Голосовать",
    voting: "Отправка...",
  },
  ar: {
    bull: "صعود",
    bear: "هبوط",
    vote: "تصويت",
    voting: "جارٍ إرسال التصويت...",
  },
  hi: {
    bull: "तेजी",
    bear: "मंदी",
    vote: "मतदान",
    voting: "मतदान भेजा जा रहा है...",
  },
};

export const PREDICTION_LABELS: Record<Language, string> = {
  en: "My prediction for {market}",
  ko: "{market} 에 대한 나의 예측",
  ja: "{market} の私の予測",
  zh: "我对 {market} 的预测",
  de: "Meine Prognose für {market}",
  fr: "Ma prévision pour {market}",
  es: "Mi predicción para {market}",
  pt: "Minha previsão para {market}",
  it: "La mia previsione per {market}",
  ru: "Мой прогноз по {market}",
  ar: "توقعي بشأن {market}",
  hi: "{market} के लिए मेरा पूर्वानुमान",
};

export const COMMENT_LABELS: Record<
  Language,
  {
    comment: string;
    write: string;
    login: string;
    failed: string;
    success: string;
    posting: string;
  }
> = {
  en: {
    comment: "Comment",
    write: "Write a comment...",
    login: "Log in to write a comment...",
    failed: "Failed to add comment.",
    success: "Comment added.",
    posting: "Posting...",
  },
  ko: {
    comment: "완료",
    write: "의견을 입력하세요...",
    login: "작성하려면 로그인하세요...",
    failed: "코멘트를 등록하지 못했습니다.",
    success: "코멘트가 등록되었습니다.",
    posting: "등록 중...",
  },
  ja: {
    comment: "投稿",
    write: "コメントを入力してください...",
    login: "コメントするにはログインしてください...",
    failed: "コメントを投稿できませんでした。",
    success: "コメントを投稿しました。",
    posting: "投稿中...",
  },
  zh: {
    comment: "发表",
    write: "写下你的看法...",
    login: "请登录后发表评论...",
    failed: "评论发表失败。",
    success: "评论已发表。",
    posting: "发表中...",
  },
  de: {
    comment: "Kommentieren",
    write: "Schreibe einen Kommentar...",
    login: "Melde dich an, um einen Kommentar zu schreiben...",
    failed: "Der Kommentar konnte nicht veröffentlicht werden.",
    success: "Kommentar veröffentlicht.",
    posting: "Veröffentlichen...",
  },
  fr: {
    comment: "Publier",
    write: "Écrivez un commentaire...",
    login: "Connectez-vous pour écrire un commentaire...",
    failed: "Impossible de publier le commentaire.",
    success: "Commentaire publié.",
    posting: "Publication...",
  },
  es: {
    comment: "Publicar",
    write: "Escribe un comentario...",
    login: "Inicia sesión para escribir un comentario...",
    failed: "No se pudo publicar el comentario.",
    success: "Comentario publicado.",
    posting: "Publicando...",
  },
  pt: {
    comment: "Publicar",
    write: "Escreva um comentário...",
    login: "Entre para escrever um comentário...",
    failed: "Não foi possível publicar o comentário.",
    success: "Comentário publicado.",
    posting: "Publicando...",
  },
  it: {
    comment: "Pubblica",
    write: "Scrivi un commento...",
    login: "Accedi per scrivere un commento...",
    failed: "Impossibile pubblicare il commento.",
    success: "Commento pubblicato.",
    posting: "Pubblicazione...",
  },
  ru: {
    comment: "Отправить",
    write: "Напишите комментарий...",
    login: "Войдите, чтобы написать комментарий...",
    failed: "Не удалось опубликовать комментарий.",
    success: "Комментарий опубликован.",
    posting: "Опубликование...",
  },
  ar: {
    comment: "نشر",
    write: "اكتب تعليقًا...",
    login: "سجّل الدخول لكتابة تعليق...",
    failed: "تعذّر نشر التعليق.",
    success: "تم نشر التعليق.",
    posting: "نشر...",
  },
  hi: {
    comment: "पोस्ट करें",
    write: "अपनी राय लिखें...",
    login: "कमेंट लिखने के लिए लॉग इन करें...",
    failed: "कमेंट पोस्ट नहीं हो सका।",
    success: "कमेंट पोस्ट हो गया।",
    posting: "पोस्ट हो रहा है...",
  },
};

export const MARKET_LABELS: Record<
  Language,
  {
    data_delayed: string;
    disclaimer: string;
    prev_close: string;
  }
> = {
  en: {
    data_delayed: "Data delayed {minutes}m",
    disclaimer: "Disclaimer",
    prev_close: "Previous close",
  },
  ko: {
    data_delayed: "지연 {minutes}분",
    disclaimer: "면책",
    prev_close: "전일 종가",
  },
  ja: {
    data_delayed: "{minutes}分遅延",
    disclaimer: "免責",
    prev_close: "前日終値",
  },
  zh: {
    data_delayed: "延迟{minutes}分钟",
    disclaimer: "免责",
    prev_close: "前收盘价",
  },
  de: {
    data_delayed: "{minutes} Min. verzögert",
    disclaimer: "Haftungsausschluss",
    prev_close: "Vorheriger Schlusskurs",
  },
  fr: {
    data_delayed: "Retard de {minutes} min",
    disclaimer: "Avertissement",
    prev_close: "Clôture précédente",
  },
  es: {
    data_delayed: "Retraso de {minutes} min",
    disclaimer: "Aviso legal",
    prev_close: "Cierre anterior",
  },
  pt: {
    data_delayed: "Atraso de {minutes} min",
    disclaimer: "Aviso legal",
    prev_close: "Fechamento anterior",
  },
  it: {
    data_delayed: "Ritardo di {minutes} min",
    disclaimer: "Avvertenze",
    prev_close: "Chiusura precedente",
  },
  ru: {
    data_delayed: "Задержка {minutes} мин",
    disclaimer: "Отказ от ответственности",
    prev_close: "Предыдущее закрытие",
  },
  ar: {
    data_delayed: "تأخير {minutes} دقيقة",
    disclaimer: "إخلاء المسؤولية",
    prev_close: "الإغلاق السابق",
  },
  hi: {
    data_delayed: "{minutes} मिनट की देरी",
    disclaimer: "अस्वीकरण",
    prev_close: "पिछला बंद भाव",
  },
};

export const STATISTICS_LABELS: Record<
  Language,
  {
    no_vote_yet: string;
    voters: string;
    votes: string;
    you_voted: string;
  }
> = {
  en: {
    no_vote_yet: "No vote yet",
    voters: "Voters",
    votes: "Votes",
    you_voted: "You've voted {voteDirection}",
  },
  ko: {
    no_vote_yet: "아직 투표가 없습니다",
    voters: "투표자",
    votes: "투표 수",
    you_voted: "{voteDirection}에 투표했습니다",
  },
  ja: {
    no_vote_yet: "まだ投票がありません",
    voters: "投票者",
    votes: "投票数",
    you_voted: "{voteDirection}に投票しました",
  },
  zh: {
    no_vote_yet: "暂无投票",
    voters: "投票人数",
    votes: "票数",
    you_voted: "你已选择{voteDirection}",
  },
  de: {
    no_vote_yet: "Noch keine Stimmen",
    voters: "Abstimmende",
    votes: "Stimmen",
    you_voted: "Du hast für {voteDirection} gestimmt",
  },
  fr: {
    no_vote_yet: "Aucun vote pour le moment",
    voters: "Votants",
    votes: "Votes",
    you_voted: "Vous avez voté pour {voteDirection}",
  },
  es: {
    no_vote_yet: "Aún no hay votos",
    voters: "Votantes",
    votes: "Votos",
    you_voted: "Has votado por {voteDirection}",
  },
  pt: {
    no_vote_yet: "Ainda não há votos",
    voters: "Votantes",
    votes: "Votos",
    you_voted: "Você votou em {voteDirection}",
  },
  it: {
    no_vote_yet: "Nessun voto per ora",
    voters: "Votanti",
    votes: "Voti",
    you_voted: "Hai votato per {voteDirection}",
  },
  ru: {
    no_vote_yet: "Пока нет голосов",
    voters: "Участники",
    votes: "Голоса",
    you_voted: "Вы проголосовали за {voteDirection}",
  },
  ar: {
    no_vote_yet: "لا توجد أصوات بعد",
    voters: "المصوّتون",
    votes: "الأصوات",
    you_voted: "لقد صوّتّ لصالح {voteDirection}",
  },
  hi: {
    no_vote_yet: "अभी तक कोई वोट नहीं",
    voters: "मतदाता",
    votes: "वोट",
    you_voted: "आपने {voteDirection} के लिए वोट दिया है",
  },
};

export const MARKET_DETAIL_LABELS: Record<
  Language,
  {
    ranges: Record<string, string>;
    disclaimer_message: string;
  }
> = {
  en: {
    ranges: {
      "1D": "Today",
      "5D": "Past 5 Days",
      "1M": "Past Month",
      "3M": "Past 3 Months",
      "6M": "Past 6 Months",
      YTD: "Year to Date",
      "1Y": "Past Year",
      "5Y": "Past 5 Years",
      MAX: "All Time",
    },
    disclaimer_message:
      "Market data is provided for informational purposes only.",
  },
  ko: {
    ranges: {
      "1D": "오늘",
      "5D": "최근 5일",
      "1M": "최근 1개월",
      "3M": "최근 3개월",
      "6M": "최근 6개월",
      YTD: "올해",
      "1Y": "최근 1년",
      "5Y": "최근 5년",
      MAX: "전체 기간",
    },
    disclaimer_message: "시장 데이터는 정보 제공 목적으로만 제공됩니다.",
  },
  ja: {
    ranges: {
      "1D": "今日",
      "5D": "過去5日間",
      "1M": "過去1か月",
      "3M": "過去3か月",
      "6M": "過去6か月",
      YTD: "年初来",
      "1Y": "過去1年",
      "5Y": "過去5年",
      MAX: "全期間",
    },
    disclaimer_message: "市場データは情報提供のみを目的としています。",
  },
  zh: {
    ranges: {
      "1D": "今日",
      "5D": "近5日",
      "1M": "近1个月",
      "3M": "近3个月",
      "6M": "近6个月",
      YTD: "年初至今",
      "1Y": "近1年",
      "5Y": "近5年",
      MAX: "全部",
    },
    disclaimer_message: "市场数据仅供参考。",
  },
  de: {
    ranges: {
      "1D": "Heute",
      "5D": "Letzte 5 Tage",
      "1M": "Letzter Monat",
      "3M": "Letzte 3 Monate",
      "6M": "Letzte 6 Monate",
      YTD: "Seit Jahresbeginn",
      "1Y": "Letztes Jahr",
      "5Y": "Letzte 5 Jahre",
      MAX: "Gesamter Zeitraum",
    },
    disclaimer_message: "Marktdaten dienen ausschließlich der Information.",
  },
  fr: {
    ranges: {
      "1D": "Aujourd’hui",
      "5D": "5 derniers jours",
      "1M": "Dernier mois",
      "3M": "3 derniers mois",
      "6M": "6 derniers mois",
      YTD: "Depuis le début de l’année",
      "1Y": "Dernière année",
      "5Y": "5 dernières années",
      MAX: "Toute la période",
    },
    disclaimer_message:
      "Les données de marché sont fournies à titre informatif uniquement.",
  },
  es: {
    ranges: {
      "1D": "Hoy",
      "5D": "Últimos 5 días",
      "1M": "Último mes",
      "3M": "Últimos 3 meses",
      "6M": "Últimos 6 meses",
      YTD: "Desde principios de año",
      "1Y": "Último año",
      "5Y": "Últimos 5 años",
      MAX: "Todo el período",
    },
    disclaimer_message:
      "Los datos de mercado se proporcionan únicamente con fines informativos.",
  },
  pt: {
    ranges: {
      "1D": "Hoje",
      "5D": "Últimos 5 dias",
      "1M": "Último mês",
      "3M": "Últimos 3 meses",
      "6M": "Últimos 6 meses",
      YTD: "Desde o início do ano",
      "1Y": "Último ano",
      "5Y": "Últimos 5 anos",
      MAX: "Todo o período",
    },
    disclaimer_message:
      "Os dados de mercado são fornecidos apenas para fins informativos.",
  },
  it: {
    ranges: {
      "1D": "Oggi",
      "5D": "Ultimi 5 giorni",
      "1M": "Ultimo mese",
      "3M": "Ultimi 3 mesi",
      "6M": "Ultimi 6 mesi",
      YTD: "Da inizio anno",
      "1Y": "Ultimo anno",
      "5Y": "Ultimi 5 anni",
      MAX: "Intero periodo",
    },
    disclaimer_message:
      "I dati di mercato sono forniti esclusivamente a scopo informativo.",
  },
  ru: {
    ranges: {
      "1D": "Сегодня",
      "5D": "Последние 5 дней",
      "1M": "Последний месяц",
      "3M": "Последние 3 месяца",
      "6M": "Последние 6 месяцев",
      YTD: "С начала года",
      "1Y": "Последний год",
      "5Y": "Последние 5 лет",
      MAX: "Весь период",
    },
    disclaimer_message:
      "Рыночные данные предоставляются исключительно в информационных целях.",
  },
  ar: {
    ranges: {
      "1D": "اليوم",
      "5D": "آخر 5 أيام",
      "1M": "آخر شهر",
      "3M": "آخر 3 أشهر",
      "6M": "آخر 6 أشهر",
      YTD: "منذ بداية العام",
      "1Y": "آخر سنة",
      "5Y": "آخر 5 سنوات",
      MAX: "كامل الفترة",
    },
    disclaimer_message: "تُقدَّم بيانات السوق لأغراض المعلومات فقط.",
  },
  hi: {
    ranges: {
      "1D": "आज",
      "5D": "पिछले 5 दिन",
      "1M": "पिछला महीना",
      "3M": "पिछले 3 महीने",
      "6M": "पिछले 6 महीने",
      YTD: "वर्ष की शुरुआत से",
      "1Y": "पिछला वर्ष",
      "5Y": "पिछले 5 वर्ष",
      MAX: "पूरी अवधि",
    },
    disclaimer_message: "बाज़ार के आँकड़े केवल जानकारी के लिए दिए जाते हैं।",
  },
};

export const CHART_LABELS: Record<
  Language,
  {
    data_unavailable: string;
    ranges: Record<string, string>;
  }
> = {
  en: {
    data_unavailable: "Data unavailable",
    ranges: {
      "1D": "1D",
      "5D": "5D",
      "1M": "1M",
      "3M": "3M",
      "6M": "6M",
      YTD: "YTD",
      "1Y": "1Y",
      "5Y": "5Y",
      MAX: "MAX",
    },
  },
  ko: {
    data_unavailable: "데이터 없음",
    ranges: {
      "1D": "1일",
      "5D": "5일",
      "1M": "1개월",
      "3M": "3개월",
      "6M": "6개월",
      YTD: "올해",
      "1Y": "1년",
      "5Y": "5년",
      MAX: "전체",
    },
  },
  ja: {
    data_unavailable: "データなし",
    ranges: {
      "1D": "1日",
      "5D": "5日",
      "1M": "1か月",
      "3M": "3か月",
      "6M": "6か月",
      YTD: "年初来",
      "1Y": "1年",
      "5Y": "5年",
      MAX: "全期間",
    },
  },
  zh: {
    data_unavailable: "暂无数据",
    ranges: {
      "1D": "1日",
      "5D": "5日",
      "1M": "1个月",
      "3M": "3个月",
      "6M": "6个月",
      YTD: "年初至今",
      "1Y": "1年",
      "5Y": "5年",
      MAX: "全部",
    },
  },
  de: {
    data_unavailable: "Keine Daten verfügbar",
    ranges: {
      "1D": "1T",
      "5D": "5T",
      "1M": "1M",
      "3M": "3M",
      "6M": "6M",
      YTD: "Seit Jahresbeginn",
      "1Y": "1J",
      "5Y": "5J",
      MAX: "Max",
    },
  },
  fr: {
    data_unavailable: "Données indisponibles",
    ranges: {
      "1D": "1j",
      "5D": "5j",
      "1M": "1m",
      "3M": "3m",
      "6M": "6m",
      YTD: "Depuis janvier",
      "1Y": "1an",
      "5Y": "5ans",
      MAX: "Tout",
    },
  },
  es: {
    data_unavailable: "Datos no disponibles",
    ranges: {
      "1D": "1d",
      "5D": "5d",
      "1M": "1m",
      "3M": "3m",
      "6M": "6m",
      YTD: "Este año",
      "1Y": "1a",
      "5Y": "5a",
      MAX: "Todo",
    },
  },
  pt: {
    data_unavailable: "Dados indisponíveis",
    ranges: {
      "1D": "1d",
      "5D": "5d",
      "1M": "1m",
      "3M": "3m",
      "6M": "6m",
      YTD: "Este ano",
      "1Y": "1a",
      "5Y": "5a",
      MAX: "Tudo",
    },
  },
  it: {
    data_unavailable: "Dati non disponibili",
    ranges: {
      "1D": "1g",
      "5D": "5g",
      "1M": "1m",
      "3M": "3m",
      "6M": "6m",
      YTD: "Da inizio anno",
      "1Y": "1a",
      "5Y": "5a",
      MAX: "Tutto",
    },
  },
  ru: {
    data_unavailable: "Данные недоступны",
    ranges: {
      "1D": "1д",
      "5D": "5д",
      "1M": "1мес",
      "3M": "3мес",
      "6M": "6мес",
      YTD: "С начала года",
      "1Y": "1г",
      "5Y": "5л",
      MAX: "Всё",
    },
  },
  ar: {
    data_unavailable: "البيانات غير متاحة",
    ranges: {
      "1D": "يوم",
      "5D": "5 أيام",
      "1M": "شهر",
      "3M": "3 أشهر",
      "6M": "6 أشهر",
      YTD: "منذ بداية العام",
      "1Y": "سنة",
      "5Y": "5 سنوات",
      MAX: "الكل",
    },
  },
  hi: {
    data_unavailable: "डेटा उपलब्ध नहीं है",
    ranges: {
      "1D": "1 दिन",
      "5D": "5 दिन",
      "1M": "1 माह",
      "3M": "3 माह",
      "6M": "6 माह",
      YTD: "इस वर्ष",
      "1Y": "1 वर्ष",
      "5Y": "5 वर्ष",
      MAX: "सभी",
    },
  },
};

export const OTHER_LABELS: Record<Language, string> = {
  en: "Other",
  ko: "기타",
  ja: "その他",
  zh: "其他",
  de: "Sonstige",
  fr: "Autres",
  es: "Otros",
  pt: "Outros",
  it: "Altri",
  ru: "Другие",
  ar: "أخرى",
  hi: "अन्य",
};

export const VOTE_TOAST_LABELS: Record<
  Language,
  {
    unsupported: string;
    login: string;
    nationality_required: string;
    already_voted: string;
    invalid_amount: string;
    market_open: string;
    unavailable: string;
    success: string;
    success_with_points: string;
    failed: string;
  }
> = {
  en: {
    unsupported: "Predictions are not available for this asset.",
    login: "Log in to make your prediction.",
    nationality_required: "Please set your nationality before voting.",
    already_voted: "You have already voted for this round.",
    invalid_amount: "Bet amount must be 0 or between 50 and 500 points.",
    market_open: "Voting is closed while the market is open.",
    unavailable: "Voting is currently unavailable.",
    success: "Your prediction ({voteDirection}) has been submitted.",
    success_with_points:
      "Your prediction ({voteDirection}) has been submitted with {points} pts.",
    failed: "Failed to submit prediction.",
  },
  ko: {
    unsupported: "이 자산은 예측 투표를 지원하지 않습니다.",
    login: "예측하려면 로그인하세요.",
    nationality_required: "투표 전에 국적을 설정해주세요.",
    already_voted: "이번 회차에 이미 투표했습니다.",
    invalid_amount: "투표 포인트는 0 또는 50~500포인트여야 합니다.",
    market_open: "장이 열려 있는 동안에는 투표할 수 없습니다.",
    unavailable: "현재 투표할 수 없습니다.",
    success: "{voteDirection} 예측이 제출되었습니다.",
    success_with_points:
      "{points}포인트로 {voteDirection} 예측이 제출되었습니다.",
    failed: "예측을 제출하지 못했습니다.",
  },
  ja: {
    unsupported: "この資産は予測投票に対応していません。",
    login: "予測するにはログインしてください。",
    nationality_required: "投票前に国籍を設定してください。",
    already_voted: "今回はすでに投票済みです。",
    invalid_amount: "投票ポイントは0、または50〜500ポイントにしてください。",
    market_open: "取引時間中は投票できません。",
    unavailable: "現在、投票できません。",
    success: "{voteDirection}の予測を送信しました。",
    success_with_points:
      "{points}ポイントで{voteDirection}の予測を送信しました。",
    failed: "予測を送信できませんでした。",
  },
  zh: {
    unsupported: "此资产不支持预测投票。",
    login: "请登录后进行预测。",
    nationality_required: "请先设置国籍再投票。",
    already_voted: "你已在本轮投过票。",
    invalid_amount: "投注积分必须为0或50至500积分。",
    market_open: "市场交易期间无法投票。",
    unavailable: "当前无法投票。",
    success: "你的{voteDirection}预测已提交。",
    success_with_points: "你的{voteDirection}预测已提交，投注{points}积分。",
    failed: "预测提交失败。",
  },
  de: {
    unsupported: "Für diesen Vermögenswert sind keine Prognosen möglich.",
    login: "Melde dich an, um eine Prognose abzugeben.",
    nationality_required:
      "Bitte lege vor der Abstimmung deine Nationalität fest.",
    already_voted: "Du hast in dieser Runde bereits abgestimmt.",
    invalid_amount:
      "Der Einsatz muss 0 oder zwischen 50 und 500 Punkten liegen.",
    market_open: "Während der Handelszeiten ist die Abstimmung geschlossen.",
    unavailable: "Die Abstimmung ist derzeit nicht verfügbar.",
    success: "Deine Prognose ({voteDirection}) wurde übermittelt.",
    success_with_points:
      "Deine Prognose ({voteDirection}) wurde mit {points} Punkten Einsatz übermittelt.",
    failed: "Deine Prognose konnte nicht übermittelt werden.",
  },
  fr: {
    unsupported: "Les prévisions ne sont pas disponibles pour cet actif.",
    login: "Connectez-vous pour faire une prévision.",
    nationality_required:
      "Veuillez renseigner votre nationalité avant de voter.",
    already_voted: "Vous avez déjà voté pour ce tour.",
    invalid_amount:
      "La mise doit être de 0 ou comprise entre 50 et 500 points.",
    market_open: "Le vote est fermé pendant les heures de marché.",
    unavailable: "Le vote est actuellement indisponible.",
    success: "Votre prévision ({voteDirection}) a été envoyée.",
    success_with_points:
      "Votre prévision ({voteDirection}) a été envoyée avec une mise de {points} points.",
    failed: "Impossible d’envoyer votre prévision.",
  },
  es: {
    unsupported: "Las predicciones no están disponibles para este activo.",
    login: "Inicia sesión para hacer una predicción.",
    nationality_required: "Configura tu nacionalidad antes de votar.",
    already_voted: "Ya has votado en esta ronda.",
    invalid_amount: "La apuesta debe ser de 0 o de entre 50 y 500 puntos.",
    market_open: "La votación está cerrada mientras el mercado está abierto.",
    unavailable: "La votación no está disponible en este momento.",
    success: "Tu predicción ({voteDirection}) se ha enviado.",
    success_with_points:
      "Tu predicción ({voteDirection}) se ha enviado con una apuesta de {points} puntos.",
    failed: "No se pudo enviar tu predicción.",
  },
  pt: {
    unsupported: "As previsões não estão disponíveis para este ativo.",
    login: "Entre para fazer uma previsão.",
    nationality_required: "Defina sua nacionalidade antes de votar.",
    already_voted: "Você já votou nesta rodada.",
    invalid_amount: "A aposta deve ser de 0 ou entre 50 e 500 pontos.",
    market_open: "A votação fica fechada enquanto o mercado está aberto.",
    unavailable: "A votação está indisponível no momento.",
    success: "Sua previsão ({voteDirection}) foi enviada.",
    success_with_points:
      "Sua previsão ({voteDirection}) foi enviada com uma aposta de {points} pontos.",
    failed: "Não foi possível enviar sua previsão.",
  },
  it: {
    unsupported: "Le previsioni non sono disponibili per questo asset.",
    login: "Accedi per fare una previsione.",
    nationality_required: "Imposta la tua nazionalità prima di votare.",
    already_voted: "Hai già votato in questo turno.",
    invalid_amount: "La puntata deve essere di 0 oppure tra 50 e 500 punti.",
    market_open: "La votazione è chiusa mentre il mercato è aperto.",
    unavailable: "La votazione non è attualmente disponibile.",
    success: "La tua previsione ({voteDirection}) è stata inviata.",
    success_with_points:
      "La tua previsione ({voteDirection}) è stata inviata con una puntata di {points} punti.",
    failed: "Impossibile inviare la tua previsione.",
  },
  ru: {
    unsupported: "Прогнозы для этого актива недоступны.",
    login: "Войдите, чтобы сделать прогноз.",
    nationality_required: "Укажите гражданство перед голосованием.",
    already_voted: "Вы уже проголосовали в этом раунде.",
    invalid_amount: "Ставка должна составлять 0 или от 50 до 500 баллов.",
    market_open: "Во время торгов голосование закрыто.",
    unavailable: "Голосование сейчас недоступно.",
    success: "Ваш прогноз ({voteDirection}) отправлен.",
    success_with_points:
      "Ваш прогноз ({voteDirection}) отправлен со ставкой {points} баллов.",
    failed: "Не удалось отправить прогноз.",
  },
  ar: {
    unsupported: "التوقعات غير متاحة لهذا الأصل.",
    login: "سجّل الدخول لتقديم توقعك.",
    nationality_required: "يرجى تحديد جنسيتك قبل التصويت.",
    already_voted: "لقد صوّتّ بالفعل في هذه الجولة.",
    invalid_amount: "يجب أن يكون الرهان 0 أو بين 50 و500 نقطة.",
    market_open: "التصويت مغلق أثناء ساعات التداول.",
    unavailable: "التصويت غير متاح حاليًا.",
    success: "تم إرسال توقعك ({voteDirection}).",
    success_with_points:
      "تم إرسال توقعك ({voteDirection}) برهان قدره {points} نقطة.",
    failed: "تعذّر إرسال توقعك.",
  },
  hi: {
    unsupported: "इस परिसंपत्ति के लिए पूर्वानुमान उपलब्ध नहीं हैं।",
    login: "अपना पूर्वानुमान देने के लिए लॉग इन करें।",
    nationality_required: "वोट देने से पहले अपनी राष्ट्रीयता चुनें।",
    already_voted: "आप इस राउंड में पहले ही वोट दे चुके हैं।",
    invalid_amount: "दाँव 0 या 50 से 500 पॉइंट के बीच होना चाहिए।",
    market_open: "बाज़ार खुला होने पर वोटिंग बंद रहती है।",
    unavailable: "अभी वोटिंग उपलब्ध नहीं है।",
    success: "आपका पूर्वानुमान ({voteDirection}) भेज दिया गया है।",
    success_with_points:
      "आपका पूर्वानुमान ({voteDirection}) {points} पॉइंट के दाँव के साथ भेज दिया गया है।",
    failed: "पूर्वानुमान भेजा नहीं जा सका।",
  },
};

export const VOTING_COUNTDOWN_LABELS: Record<
  Language,
  {
    closed: string;
    now_open: string;
    opens_in: string;
    closes_in: string;
  }
> = {
  en: {
    closed: "Voting closed",
    now_open: "Voting is now open",
    opens_in: "Voting opens in {countdown}",
    closes_in: "Voting closes in {countdown}",
  },
  ko: {
    closed: "투표 마감",
    now_open: "투표가 시작되었습니다",
    opens_in: "투표 개방 {countdown} 전",
    closes_in: "투표 종료 {countdown} 전",
  },
  ja: {
    closed: "投票終了",
    now_open: "投票が開始されました",
    opens_in: "投票開始まで {countdown}",
    closes_in: "投票終了まで {countdown}",
  },
  zh: {
    closed: "投票已结束",
    now_open: "投票已开放",
    opens_in: "距离投票开始还有 {countdown}",
    closes_in: "距离投票结束还有 {countdown}",
  },
  de: {
    closed: "Abstimmung geschlossen",
    now_open: "Abstimmung jetzt offen",
    opens_in: "Abstimmung öffnet in {countdown}",
    closes_in: "Abstimmung endet in {countdown}",
  },
  fr: {
    closed: "Vote fermé",
    now_open: "Le vote est ouvert",
    opens_in: "Ouverture du vote dans {countdown}",
    closes_in: "Fin du vote dans {countdown}",
  },
  es: {
    closed: "Votación cerrada",
    now_open: "La votación está abierta",
    opens_in: "La votación abre en {countdown}",
    closes_in: "La votación cierra en {countdown}",
  },
  pt: {
    closed: "Votação encerrada",
    now_open: "A votação está aberta",
    opens_in: "A votação abre em {countdown}",
    closes_in: "A votação encerra em {countdown}",
  },
  it: {
    closed: "Votazione chiusa",
    now_open: "La votazione è aperta",
    opens_in: "La votazione apre tra {countdown}",
    closes_in: "La votazione termina tra {countdown}",
  },
  ru: {
    closed: "Голосование закрыто",
    now_open: "Голосование открыто",
    opens_in: "До начала голосования: {countdown}",
    closes_in: "До конца голосования: {countdown}",
  },
  ar: {
    closed: "التصويت مغلق",
    now_open: "التصويت مفتوح الآن",
    opens_in: "يفتح التصويت خلال {countdown}",
    closes_in: "يغلق التصويت خلال {countdown}",
  },
  hi: {
    closed: "मतदान बंद है",
    now_open: "मतदान शुरू हो गया है",
    opens_in: "मतदान {countdown} में शुरू होगा",
    closes_in: "मतदान {countdown} में बंद होगा",
  },
};

export const WATCHLIST_LABELS: Record<
  Language,
  {
    manage: string;
    title: string;
    description: string;
    selected: string;
    market_count: string;
    limit: string;
    login: string;
    updated: string;
    failed: string;
    partial_failure: string;
    saving: string;
    save: string;
    my_markets: string;
    previous: string;
    next: string;
    view_market: string;
  }
> = {
  en: {
    manage: "Manage watchlist",
    title: "Manage your watchlist",
    description: "Select up to {max} markets you'd like to follow.",
    selected: "{count} / {max} selected.",
    market_count: "{count} / {max} markets",
    limit: "You can follow up to {max} markets.",
    login: "Log in to manage your watchlist.",
    updated: "Watchlist updated.",
    failed: "Failed to update your watchlist.",
    partial_failure:
      "Markets were removed, but new markets could not be added. Please try again.",
    saving: "Saving...",
    save: "Save changes",
    my_markets: "My markets",
    previous: "Previous markets",
    next: "Next markets",
    view_market: "View {market}",
  },
  ko: {
    manage: "관심 종목 편집",
    title: "관심 종목 선택",
    description: "관심 있는 시장을 최대 {max}개 선택하세요.",
    selected: "{count} / {max}개 선택됨",
    market_count: "{count} / {max}개 시장",
    limit: "최대 {max}개 종목을 관심 종목으로 추가할 수 있습니다.",
    login: "관심 종목을 관리하려면 로그인하세요.",
    updated: "관심 종목이 업데이트되었습니다.",
    failed: "관심 종목을 업데이트하지 못했습니다.",
    partial_failure:
      "해당 종목은 삭제되었지만 새 종목은 추가하지 못했습니다. 다시 시도해주세요.",
    saving: "저장 중...",
    save: "변경 사항 저장",
    my_markets: "내 관심 종목",
    previous: "이전",
    next: "다음",
    view_market: "{market} 보기",
  },
  ja: {
    manage: "ウォッチリスト管理",
    title: "ウォッチリストを管理",
    description: "フォローしたい市場を最大{max}件選択してください。",
    selected: "{count} / {max}件選択済み",
    market_count: "{count} / {max}市場",
    limit: "最大{max}市場をフォローできます。",
    login: "ウォッチリストを管理するにはログインしてください。",
    updated: "ウォッチリストを更新しました。",
    failed: "ウォッチリストを更新できませんでした。",
    partial_failure:
      "市場は削除されましたが、新しい市場を追加できませんでした。もう一度お試しください。",
    saving: "保存中...",
    save: "変更を保存",
    my_markets: "自分の市場",
    previous: "前の市場",
    next: "次の市場",
    view_market: "{market}を見る",
  },
  zh: {
    manage: "管理关注列表",
    title: "管理你的关注列表",
    description: "选择你想关注的市场，最多{max}个。",
    selected: "已选择 {count} / {max} 个",
    market_count: "{count} / {max} 个市场",
    limit: "你最多可以关注{max}个市场。",
    login: "请登录后管理关注列表。",
    updated: "关注列表已更新。",
    failed: "关注列表更新失败。",
    partial_failure: "市场已移除，但无法添加新市场。请重试。",
    saving: "保存中...",
    save: "保存更改",
    my_markets: "我的市场",
    previous: "上一组市场",
    next: "下一组市场",
    view_market: "查看{market}",
  },
  de: {
    manage: "Watchlist verwalten",
    title: "Deine Watchlist verwalten",
    description: "Wähle bis zu {max} Märkte aus, denen du folgen möchtest.",
    selected: "{count} / {max} ausgewählt.",
    market_count: "{count} / {max} Märkte",
    limit: "Du kannst bis zu {max} Märkten folgen.",
    login: "Melde dich an, um deine Watchlist zu verwalten.",
    updated: "Watchlist aktualisiert.",
    failed: "Die Watchlist konnte nicht aktualisiert werden.",
    partial_failure:
      "Märkte wurden entfernt, aber neue Märkte konnten nicht hinzugefügt werden. Bitte versuche es erneut.",
    saving: "Wird gespeichert...",
    save: "Änderungen speichern",
    my_markets: "Meine Märkte",
    previous: "Vorherige Märkte",
    next: "Nächste Märkte",
    view_market: "{market} ansehen",
  },
  fr: {
    manage: "Gérer la liste de suivi",
    title: "Gérer votre liste de suivi",
    description: "Sélectionnez jusqu’à {max} marchés à suivre.",
    selected: "{count} / {max} sélectionnés.",
    market_count: "{count} / {max} marchés",
    limit: "Vous pouvez suivre jusqu’à {max} marchés.",
    login: "Connectez-vous pour gérer votre liste de suivi.",
    updated: "Liste de suivi mise à jour.",
    failed: "Impossible de mettre à jour votre liste de suivi.",
    partial_failure:
      "Des marchés ont été retirés, mais les nouveaux n’ont pas pu être ajoutés. Réessayez.",
    saving: "Enregistrement...",
    save: "Enregistrer",
    my_markets: "Mes marchés",
    previous: "Marchés précédents",
    next: "Marchés suivants",
    view_market: "Voir {market}",
  },
  es: {
    manage: "Gestionar lista de seguimiento",
    title: "Gestionar tu lista de seguimiento",
    description: "Selecciona hasta {max} mercados que quieras seguir.",
    selected: "{count} / {max} seleccionados.",
    market_count: "{count} / {max} mercados",
    limit: "Puedes seguir hasta {max} mercados.",
    login: "Inicia sesión para gestionar tu lista de seguimiento.",
    updated: "Lista de seguimiento actualizada.",
    failed: "No se pudo actualizar tu lista de seguimiento.",
    partial_failure:
      "Se eliminaron mercados, pero no se pudieron añadir los nuevos. Inténtalo de nuevo.",
    saving: "Guardando...",
    save: "Guardar cambios",
    my_markets: "Mis mercados",
    previous: "Mercados anteriores",
    next: "Mercados siguientes",
    view_market: "Ver {market}",
  },
  pt: {
    manage: "Gerenciar lista de acompanhamento",
    title: "Gerenciar sua lista de acompanhamento",
    description: "Selecione até {max} mercados que deseja acompanhar.",
    selected: "{count} / {max} selecionados.",
    market_count: "{count} / {max} mercados",
    limit: "Você pode acompanhar até {max} mercados.",
    login: "Entre para gerenciar sua lista de acompanhamento.",
    updated: "Lista de acompanhamento atualizada.",
    failed: "Não foi possível atualizar sua lista de acompanhamento.",
    partial_failure:
      "Mercados foram removidos, mas os novos não puderam ser adicionados. Tente novamente.",
    saving: "Salvando...",
    save: "Salvar alterações",
    my_markets: "Meus mercados",
    previous: "Mercados anteriores",
    next: "Próximos mercados",
    view_market: "Ver {market}",
  },
  it: {
    manage: "Gestisci la watchlist",
    title: "Gestisci la tua watchlist",
    description: "Seleziona fino a {max} mercati da seguire.",
    selected: "{count} / {max} selezionati.",
    market_count: "{count} / {max} mercati",
    limit: "Puoi seguire fino a {max} mercati.",
    login: "Accedi per gestire la tua watchlist.",
    updated: "Watchlist aggiornata.",
    failed: "Impossibile aggiornare la tua watchlist.",
    partial_failure:
      "I mercati sono stati rimossi, ma non è stato possibile aggiungerne di nuovi. Riprova.",
    saving: "Salvataggio...",
    save: "Salva modifiche",
    my_markets: "I miei mercati",
    previous: "Mercati precedenti",
    next: "Mercati successivi",
    view_market: "Visualizza {market}",
  },
  ru: {
    manage: "Управление списком",
    title: "Управление списком наблюдения",
    description: "Выберите до {max} рынков для отслеживания.",
    selected: "Выбрано: {count} / {max}",
    market_count: "Рынки: {count} / {max}",
    limit: "Можно отслеживать до {max} рынков.",
    login: "Войдите, чтобы управлять списком наблюдения.",
    updated: "Список наблюдения обновлён.",
    failed: "Не удалось обновить список наблюдения.",
    partial_failure:
      "Рынки удалены, но новые добавить не удалось. Попробуйте снова.",
    saving: "Сохранение...",
    save: "Сохранить изменения",
    my_markets: "Мои рынки",
    previous: "Предыдущие рынки",
    next: "Следующие рынки",
    view_market: "Открыть {market}",
  },
  ar: {
    manage: "إدارة قائمة المتابعة",
    title: "إدارة قائمة متابعتك",
    description: "اختر حتى {max} سوقًا ترغب في متابعتها.",
    selected: "تم اختيار {count} / {max}",
    market_count: "{count} / {max} سوقًا",
    limit: "يمكنك متابعة ما يصل إلى {max} سوقًا.",
    login: "سجّل الدخول لإدارة قائمة متابعتك.",
    updated: "تم تحديث قائمة المتابعة.",
    failed: "تعذّر تحديث قائمة متابعتك.",
    partial_failure:
      "تمت إزالة الأسواق، لكن تعذّرت إضافة أسواق جديدة. حاول مرة أخرى.",
    saving: "جارٍ الحفظ...",
    save: "حفظ التغييرات",
    my_markets: "أسواقي",
    previous: "الأسواق السابقة",
    next: "الأسواق التالية",
    view_market: "عرض {market}",
  },
  hi: {
    manage: "वॉचलिस्ट प्रबंधित करें",
    title: "अपनी वॉचलिस्ट प्रबंधित करें",
    description:
      "जिन बाज़ारों को फ़ॉलो करना चाहते हैं, उनमें से अधिकतम {max} चुनें।",
    selected: "{count} / {max} चुने गए",
    market_count: "{count} / {max} बाज़ार",
    limit: "आप अधिकतम {max} बाज़ारों को फ़ॉलो कर सकते हैं।",
    login: "अपनी वॉचलिस्ट प्रबंधित करने के लिए लॉग इन करें।",
    updated: "वॉचलिस्ट अपडेट हो गई है।",
    failed: "वॉचलिस्ट अपडेट नहीं हो सकी।",
    partial_failure:
      "बाज़ार हटा दिए गए, लेकिन नए बाज़ार नहीं जोड़े जा सके। फिर से कोशिश करें।",
    saving: "सहेजा जा रहा है...",
    save: "बदलाव सहेजें",
    my_markets: "मेरे बाज़ार",
    previous: "पिछले बाज़ार",
    next: "अगले बाज़ार",
    view_market: "{market} देखें",
  },
};

export const VOTE_INTERFACE_LABELS: Record<
  Language,
  {
    checking: string;
    lookup_failed: string;
    choose_direction: string;
    close: string;
    retry: string;
  }
> = {
  en: {
    checking: "Checking your prediction…",
    lookup_failed: "Could not check your prediction. Please try again.",
    choose_direction: "Please choose Bull or Bear.",
    close: "Close prediction input",
    retry: "Try again",
  },
  ko: {
    checking: "예측을 확인하고 있습니다…",
    lookup_failed: "예측을 확인하지 못했습니다. 다시 시도해주세요.",
    choose_direction: "상승 또는 하락을 선택해주세요.",
    close: "예측 입력 닫기",
    retry: "다시 시도",
  },
  ja: {
    checking: "予測を確認しています…",
    lookup_failed: "予測を確認できませんでした。もう一度お試しください。",
    choose_direction: "上昇または下落を選択してください。",
    close: "予測入力を閉じる",
    retry: "再試行",
  },
  zh: {
    checking: "正在检查你的预测…",
    lookup_failed: "无法检查你的预测。请重试。",
    choose_direction: "请选择看涨或看跌。",
    close: "关闭预测输入",
    retry: "重试",
  },
  de: {
    checking: "Deine Prognose wird geprüft…",
    lookup_failed:
      "Deine Prognose konnte nicht geprüft werden. Versuche es erneut.",
    choose_direction: "Bitte wähle einen steigenden oder fallenden Markt.",
    close: "Prognoseeingabe schließen",
    retry: "Erneut versuchen",
  },
  fr: {
    checking: "Vérification de votre prévision…",
    lookup_failed: "Impossible de vérifier votre prévision. Réessayez.",
    choose_direction: "Veuillez choisir une hausse ou une baisse.",
    close: "Fermer la saisie de prévision",
    retry: "Réessayer",
  },
  es: {
    checking: "Comprobando tu predicción…",
    lookup_failed: "No se pudo comprobar tu predicción. Inténtalo de nuevo.",
    choose_direction: "Elige una subida o una bajada.",
    close: "Cerrar el formulario de predicción",
    retry: "Reintentar",
  },
  pt: {
    checking: "Verificando sua previsão…",
    lookup_failed: "Não foi possível verificar sua previsão. Tente novamente.",
    choose_direction: "Escolha alta ou baixa.",
    close: "Fechar formulário de previsão",
    retry: "Tentar novamente",
  },
  it: {
    checking: "Verifica della tua previsione…",
    lookup_failed: "Impossibile verificare la tua previsione. Riprova.",
    choose_direction: "Scegli un rialzo o un ribasso.",
    close: "Chiudi il modulo di previsione",
    retry: "Riprova",
  },
  ru: {
    checking: "Проверяем ваш прогноз…",
    lookup_failed: "Не удалось проверить ваш прогноз. Попробуйте снова.",
    choose_direction: "Выберите рост или падение.",
    close: "Закрыть форму прогноза",
    retry: "Повторить",
  },
  ar: {
    checking: "جارٍ التحقق من توقعك…",
    lookup_failed: "تعذّر التحقق من توقعك. حاول مرة أخرى.",
    choose_direction: "يرجى اختيار الصعود أو الهبوط.",
    close: "إغلاق نموذج التوقع",
    retry: "حاول مرة أخرى",
  },
  hi: {
    checking: "आपका पूर्वानुमान जाँचा जा रहा है…",
    lookup_failed: "आपका पूर्वानुमान जाँचा नहीं जा सका। फिर से कोशिश करें।",
    choose_direction: "कृपया तेजी या मंदी चुनें।",
    close: "पूर्वानुमान फ़ॉर्म बंद करें",
    retry: "फिर से कोशिश करें",
  },
};

export const ONBOARDING_LABELS: Record<
  Language,
  {
    profile: string;
    markets: string;
    welcome: string;
    description: string;
    nationality: string;
    select_nationality: string;
    language: string;
    select_language: string;
    nationality_hint: string;
    continue: string;
    choose_markets: string;
    markets_description: string;
    selected: string;
    back: string;
    saving: string;
    finish: string;
    success: string;
    failed: string;
  }
> = {
  en: {
    profile: "Profile",
    markets: "Markets",
    welcome: "Welcome to {site}",
    description: "Set up your profile to get started.",
    nationality: "Nationality",
    select_nationality: "Select your nationality",
    language: "Language",
    select_language: "Select your language",
    nationality_hint:
      "Your nationality is used for regional market statistics and community insights.",
    continue: "Continue",
    choose_markets: "Choose your markets",
    markets_description: "Select the markets you'd like to follow.",
    selected: "{count} selected.",
    back: "Back",
    saving: "Saving...",
    finish: "Finish",
    success: "Profile setup complete.",
    failed: "Failed to complete profile setup.",
  },
  ko: {
    profile: "프로필",
    markets: "시장",
    welcome: "{site}에 오신 것을 환영합니다",
    description: "시작하기 전에 프로필을 설정해주세요.",
    nationality: "국적",
    select_nationality: "국적을 선택하세요",
    language: "언어",
    select_language: "언어를 선택하세요",
    nationality_hint: "국적은 지역별 시장 통계와 커뮤니티 분석에 사용됩니다.",
    continue: "다음",
    choose_markets: "관심 시장을 선택하세요",
    markets_description: "관심 목록에 추가할 시장을 선택하세요.",
    selected: "{count}개 선택됨",
    back: "이전",
    saving: "저장 중...",
    finish: "완료",
    success: "프로필 설정이 완료되었습니다.",
    failed: "프로필 설정을 완료하지 못했습니다.",
  },
  ja: {
    profile: "プロフィール",
    markets: "市場",
    welcome: "{site}へようこそ",
    description: "まずプロフィールを設定してください。",
    nationality: "国籍",
    select_nationality: "国籍を選択してください",
    language: "言語",
    select_language: "言語を選択してください",
    nationality_hint:
      "国籍は地域別の市場統計とコミュニティ分析に使用されます。",
    continue: "次へ",
    choose_markets: "市場を選択",
    markets_description: "フォローしたい市場を選択してください。",
    selected: "{count}件選択済み",
    back: "戻る",
    saving: "保存中...",
    finish: "完了",
    success: "プロフィール設定が完了しました。",
    failed: "プロフィール設定を完了できませんでした。",
  },
  zh: {
    profile: "个人资料",
    markets: "市场",
    welcome: "欢迎来到{site}",
    description: "设置个人资料以开始使用。",
    nationality: "国籍",
    select_nationality: "请选择国籍",
    language: "语言",
    select_language: "请选择语言",
    nationality_hint: "你的国籍用于地区市场统计和社区分析。",
    continue: "下一步",
    choose_markets: "选择你关注的市场",
    markets_description: "选择你想关注的市场。",
    selected: "已选择{count}个",
    back: "上一步",
    saving: "保存中...",
    finish: "完成",
    success: "个人资料设置完成。",
    failed: "无法完成个人资料设置。",
  },
  de: {
    profile: "Profil",
    markets: "Märkte",
    welcome: "Willkommen bei {site}",
    description: "Richte dein Profil ein, um loszulegen.",
    nationality: "Nationalität",
    select_nationality: "Wähle deine Nationalität",
    language: "Sprache",
    select_language: "Wähle deine Sprache",
    nationality_hint:
      "Deine Nationalität wird für regionale Marktstatistiken und Community-Analysen verwendet.",
    continue: "Weiter",
    choose_markets: "Wähle deine Märkte",
    markets_description: "Wähle die Märkte aus, denen du folgen möchtest.",
    selected: "{count} ausgewählt.",
    back: "Zurück",
    saving: "Wird gespeichert...",
    finish: "Abschließen",
    success: "Profileinrichtung abgeschlossen.",
    failed: "Die Profileinrichtung konnte nicht abgeschlossen werden.",
  },
  fr: {
    profile: "Profil",
    markets: "Marchés",
    welcome: "Bienvenue sur {site}",
    description: "Configurez votre profil pour commencer.",
    nationality: "Nationalité",
    select_nationality: "Sélectionnez votre nationalité",
    language: "Langue",
    select_language: "Sélectionnez votre langue",
    nationality_hint:
      "Votre nationalité est utilisée pour les statistiques régionales des marchés et les analyses de la communauté.",
    continue: "Continuer",
    choose_markets: "Choisissez vos marchés",
    markets_description: "Sélectionnez les marchés que vous souhaitez suivre.",
    selected: "{count} sélectionnés.",
    back: "Retour",
    saving: "Enregistrement...",
    finish: "Terminer",
    success: "Configuration du profil terminée.",
    failed: "Impossible de terminer la configuration du profil.",
  },
  es: {
    profile: "Perfil",
    markets: "Mercados",
    welcome: "Te damos la bienvenida a {site}",
    description: "Configura tu perfil para empezar.",
    nationality: "Nacionalidad",
    select_nationality: "Selecciona tu nacionalidad",
    language: "Idioma",
    select_language: "Selecciona tu idioma",
    nationality_hint:
      "Tu nacionalidad se utiliza para las estadísticas regionales de los mercados y los análisis de la comunidad.",
    continue: "Continuar",
    choose_markets: "Elige tus mercados",
    markets_description: "Selecciona los mercados que quieras seguir.",
    selected: "{count} seleccionados.",
    back: "Atrás",
    saving: "Guardando...",
    finish: "Finalizar",
    success: "Configuración del perfil completada.",
    failed: "No se pudo completar la configuración del perfil.",
  },
  pt: {
    profile: "Perfil",
    markets: "Mercados",
    welcome: "Boas-vindas ao {site}",
    description: "Configure seu perfil para começar.",
    nationality: "Nacionalidade",
    select_nationality: "Selecione sua nacionalidade",
    language: "Idioma",
    select_language: "Selecione seu idioma",
    nationality_hint:
      "Sua nacionalidade é usada para estatísticas regionais dos mercados e análises da comunidade.",
    continue: "Continuar",
    choose_markets: "Escolha seus mercados",
    markets_description: "Selecione os mercados que deseja acompanhar.",
    selected: "{count} selecionados.",
    back: "Voltar",
    saving: "Salvando...",
    finish: "Concluir",
    success: "Configuração do perfil concluída.",
    failed: "Não foi possível concluir a configuração do perfil.",
  },
  it: {
    profile: "Profilo",
    markets: "Mercati",
    welcome: "Ti diamo il benvenuto su {site}",
    description: "Configura il tuo profilo per iniziare.",
    nationality: "Nazionalità",
    select_nationality: "Seleziona la tua nazionalità",
    language: "Lingua",
    select_language: "Seleziona la tua lingua",
    nationality_hint:
      "La tua nazionalità viene utilizzata per le statistiche regionali dei mercati e le analisi della community.",
    continue: "Continua",
    choose_markets: "Scegli i tuoi mercati",
    markets_description: "Seleziona i mercati che desideri seguire.",
    selected: "{count} selezionati.",
    back: "Indietro",
    saving: "Salvataggio...",
    finish: "Completa",
    success: "Configurazione del profilo completata.",
    failed: "Impossibile completare la configurazione del profilo.",
  },
  ru: {
    profile: "Профиль",
    markets: "Рынки",
    welcome: "Добро пожаловать на {site}",
    description: "Настройте профиль, чтобы начать.",
    nationality: "Гражданство",
    select_nationality: "Выберите гражданство",
    language: "Язык",
    select_language: "Выберите язык",
    nationality_hint:
      "Гражданство используется для региональной статистики рынков и анализа сообщества.",
    continue: "Далее",
    choose_markets: "Выберите рынки",
    markets_description: "Выберите рынки, которые хотите отслеживать.",
    selected: "Выбрано: {count}",
    back: "Назад",
    saving: "Сохранение...",
    finish: "Завершить",
    success: "Настройка профиля завершена.",
    failed: "Не удалось завершить настройку профиля.",
  },
  ar: {
    profile: "الملف الشخصي",
    markets: "الأسواق",
    welcome: "مرحبًا بك في {site}",
    description: "أعدّ ملفك الشخصي للبدء.",
    nationality: "الجنسية",
    select_nationality: "اختر جنسيتك",
    language: "اللغة",
    select_language: "اختر لغتك",
    nationality_hint:
      "تُستخدم جنسيتك لإحصاءات الأسواق الإقليمية وتحليلات المجتمع.",
    continue: "متابعة",
    choose_markets: "اختر أسواقك",
    markets_description: "اختر الأسواق التي ترغب في متابعتها.",
    selected: "تم اختيار {count}",
    back: "رجوع",
    saving: "جارٍ الحفظ...",
    finish: "إنهاء",
    success: "اكتمل إعداد الملف الشخصي.",
    failed: "تعذّر إكمال إعداد الملف الشخصي.",
  },
  hi: {
    profile: "प्रोफ़ाइल",
    markets: "बाज़ार",
    welcome: "{site} पर आपका स्वागत है",
    description: "शुरू करने के लिए अपनी प्रोफ़ाइल सेट करें।",
    nationality: "राष्ट्रीयता",
    select_nationality: "अपनी राष्ट्रीयता चुनें",
    language: "भाषा",
    select_language: "अपनी भाषा चुनें",
    nationality_hint:
      "आपकी राष्ट्रीयता का उपयोग क्षेत्रीय बाज़ार आँकड़ों और समुदाय के विश्लेषण के लिए किया जाता है।",
    continue: "आगे बढ़ें",
    choose_markets: "अपने बाज़ार चुनें",
    markets_description:
      "उन बाज़ारों को चुनें जिन्हें आप फ़ॉलो करना चाहते हैं।",
    selected: "{count} चुने गए",
    back: "वापस",
    saving: "सहेजा जा रहा है...",
    finish: "पूरा करें",
    success: "प्रोफ़ाइल सेटअप पूरा हो गया है।",
    failed: "प्रोफ़ाइल सेटअप पूरा नहीं हो सका।",
  },
};
