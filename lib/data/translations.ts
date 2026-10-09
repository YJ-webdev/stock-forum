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
  en: "Prediction for {market}",
  ko: "{market} 에 대한 예측",
  ja: "{market} についての予測",
  zh: "对{market} 的预测",
  de: "Prognose für {market}",
  fr: "Prévision pour {market}",
  es: "Predicción para {market}",
  pt: "Previsão para {market}",
  it: "Previsione per {market}",
  ru: "Прогноз по {market}",
  ar: "توقع بشأن {market}",
  hi: "{market} के लिए पूर्वानुमान",
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
    lunch_break: string;
  }
> = {
  en: {
    data_delayed: "Data delayed {minutes}m",
    disclaimer: "Disclaimer",
    prev_close: "Previous close",
    lunch_break: "Lunch break",
  },
  ko: {
    data_delayed: "지연 {minutes}분",
    disclaimer: "면책",
    prev_close: "전일 종가",
    lunch_break: "점심 휴장",
  },
  ja: {
    data_delayed: "{minutes}分遅延",
    disclaimer: "免責",
    prev_close: "前日終値",
    lunch_break: "昼休み",
  },
  zh: {
    data_delayed: "延迟{minutes}分钟",
    disclaimer: "免责",
    prev_close: "前收盘价",
    lunch_break: "午间休市",
  },
  de: {
    data_delayed: "{minutes} Min. verzögert",
    disclaimer: "Haftungsausschluss",
    prev_close: "Vorheriger Schlusskurs",
    lunch_break: "Mittagspause",
  },
  fr: {
    data_delayed: "Retard de {minutes} min",
    disclaimer: "Avertissement",
    prev_close: "Clôture précédente",
    lunch_break: "Pause déjeuner",
  },
  es: {
    data_delayed: "Retraso de {minutes} min",
    disclaimer: "Aviso legal",
    prev_close: "Cierre anterior",
    lunch_break: "Pausa de almuerzo",
  },
  pt: {
    data_delayed: "Atraso de {minutes} min",
    disclaimer: "Aviso legal",
    prev_close: "Fechamento anterior",
    lunch_break: "Intervalo de almoço",
  },
  it: {
    data_delayed: "Ritardo di {minutes} min",
    disclaimer: "Avvertenze",
    prev_close: "Chiusura precedente",
    lunch_break: "Pausa pranzo",
  },
  ru: {
    data_delayed: "Задержка {minutes} мин",
    disclaimer: "Отказ от ответственности",
    prev_close: "Предыдущее закрытие",
    lunch_break: "Обеденный перерыв",
  },
  ar: {
    data_delayed: "تأخير {minutes} دقيقة",
    disclaimer: "إخلاء المسؤولية",
    prev_close: "الإغلاق السابق",
    lunch_break: "استراحة الغداء",
  },
  hi: {
    data_delayed: "{minutes} मिनट की देरी",
    disclaimer: "अस्वीकरण",
    prev_close: "पिछला बंद भाव",
    lunch_break: "दोपहर का अवकाश",
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
    no_vote_yet: "No votes",
    voters: "Voters",
    votes: "Votes",
    you_voted: "Voted {voteDirection}",
  },
  ko: {
    no_vote_yet: "투표 없음",
    voters: "투표자",
    votes: "투표 수",
    you_voted: "{voteDirection} 투표 완료",
  },
  ja: {
    no_vote_yet: "投票なし",
    voters: "投票者",
    votes: "票数",
    you_voted: "{voteDirection}に投票済み",
  },
  zh: {
    no_vote_yet: "暂无投票",
    voters: "投票人数",
    votes: "票数",
    you_voted: "已投{voteDirection}",
  },
  de: {
    no_vote_yet: "Keine Stimmen",
    voters: "Abstimmende",
    votes: "Stimmen",
    you_voted: "Für {voteDirection} gestimmt",
  },
  fr: {
    no_vote_yet: "Aucun vote",
    voters: "Votants",
    votes: "Votes",
    you_voted: "Vote : {voteDirection}",
  },
  es: {
    no_vote_yet: "Sin votos",
    voters: "Votantes",
    votes: "Votos",
    you_voted: "Votaste {voteDirection}",
  },
  pt: {
    no_vote_yet: "Sem votos",
    voters: "Votantes",
    votes: "Votos",
    you_voted: "Votou em {voteDirection}",
  },
  it: {
    no_vote_yet: "Nessun voto",
    voters: "Votanti",
    votes: "Voti",
    you_voted: "Hai votato {voteDirection}",
  },
  ru: {
    no_vote_yet: "Нет голосов",
    voters: "Участники",
    votes: "Голоса",
    you_voted: "Ваш голос: {voteDirection}",
  },
  ar: {
    no_vote_yet: "لا أصوات",
    voters: "المصوّتون",
    votes: "الأصوات",
    you_voted: "صوّتّ لـ{voteDirection}",
  },
  hi: {
    no_vote_yet: "कोई वोट नहीं",
    voters: "मतदाता",
    votes: "वोट",
    you_voted: "{voteDirection} को वोट दिया",
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

// lib/data/translations.ts

const COMMON_MARKET_NAMES: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^RUT": "Russell 2000",
  "^N225": "Nikkei 225",
  TOPIX: "TOPIX",
  "000300.SS": "CSI 300",
  "^NSEI": "Nifty 50",
  "^TWII": "TAIEX",
  "^KS11": "KOSPI",
  "^AXJO": "S&P/ASX 200",
  "^MXX": "S&P/BMV IPC",
  "^STOXX50E": "EURO STOXX 50",
  "^GDAXI": "DAX",
  "^FTSE": "FTSE 100",
  "^FCHI": "CAC 40",
  "FTSEMIB.MI": "FTSE MIB",
  "^IBEX": "IBEX 35",
  "^AEX": "AEX",

  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
  "USDT-USD": "Tether",
  "USDC-USD": "USD Coin",
  "BNB-USD": "BNB",
  "SOL-USD": "Solana",
  "XRP-USD": "XRP",
  "TRX-USD": "TRON",
  "DOGE-USD": "Dogecoin",
  "ADA-USD": "Cardano",

  "EURUSD=X": "EUR / USD",
  "JPY=X": "USD / JPY",
  "GBPUSD=X": "GBP / USD",
  "CAD=X": "USD / CAD",
  "CHF=X": "USD / CHF",
  "AUDUSD=X": "AUD / USD",
};

export const MARKET_NAME_LABELS: Record<Language, Record<string, string>> = {
  en: {
    ...COMMON_MARKET_NAMES,

    "^IXIC": "Nasdaq Composite",
    "^DJI": "Dow Jones Industrial Average",
    "^GSPTSE": "S&P/TSX Composite",
    "^BVSP": "Bovespa",
    "000001.SS": "Shanghai Composite",
    "^HSI": "Hang Seng",
    "^STI": "Straits Times",
    "^JKSE": "IDX Composite",
    "^SSMI": "Swiss Market Index",
    "^OMX": "OMX Stockholm 30",
    "^TASI.SR": "Tadawul All Share",
    "^JN0U.JO": "South Africa Top 40",

    "CL=F": "Crude Oil Futures",
    "GC=F": "Gold Futures",
    "SI=F": "Silver Futures",
    "NG=F": "Natural Gas Futures",
  },

  ko: {
    ...COMMON_MARKET_NAMES,

    "^IXIC": "나스닥 종합",
    "^DJI": "다우존스 산업평균",
    "^RUT": "러셀 2000",
    "^GSPTSE": "S&P/TSX 종합",
    "^BVSP": "보베스파",
    "^N225": "닛케이 225",
    TOPIX: "토픽스",
    "000001.SS": "상하이 종합",
    "^HSI": "항셍",
    "^NSEI": "니프티 50",
    "^TWII": "대만 가권",
    "^KS11": "코스피",
    "^STI": "스트레이츠 타임스",
    "^JKSE": "인도네시아 종합",
    "^STOXX50E": "유로 스톡스 50",
    "^SSMI": "스위스 시장 지수",
    "^OMX": "OMX 스톡홀름 30",
    "^TASI.SR": "타다울 종합",
    "^JN0U.JO": "남아프리카 Top 40",

    "BTC-USD": "비트코인",
    "ETH-USD": "이더리움",
    "USDT-USD": "테더",
    "USDC-USD": "USD 코인",
    "SOL-USD": "솔라나",
    "TRX-USD": "트론",
    "DOGE-USD": "도지코인",
    "ADA-USD": "카르다노",

    "CL=F": "원유 선물",
    "GC=F": "금 선물",
    "SI=F": "은 선물",
    "NG=F": "천연가스 선물",
  },

  ja: {
    ...COMMON_MARKET_NAMES,

    "^IXIC": "ナスダック総合",
    "^DJI": "ダウ工業株30種平均",
    "^RUT": "ラッセル2000",
    "^GSPTSE": "S&P/TSX総合",
    "^BVSP": "ボベスパ",
    "^N225": "日経225",
    "000001.SS": "上海総合",
    "^HSI": "ハンセン",
    "^NSEI": "ニフティ50",
    "^TWII": "台湾加権",
    "^KS11": "韓国総合株価指数",
    "^STI": "ストレーツ・タイムズ",
    "^JKSE": "ジャカルタ総合",
    "^STOXX50E": "ユーロ・ストックス50",
    "^SSMI": "スイス市場指数",
    "^OMX": "OMXストックホルム30",
    "^TASI.SR": "タダウル全株指数",
    "^JN0U.JO": "南アフリカTop 40",

    "BTC-USD": "ビットコイン",
    "ETH-USD": "イーサリアム",
    "USDT-USD": "テザー",
    "USDC-USD": "USDコイン",
    "SOL-USD": "ソラナ",
    "TRX-USD": "トロン",
    "DOGE-USD": "ドージコイン",
    "ADA-USD": "カルダノ",

    "CL=F": "原油先物",
    "GC=F": "金先物",
    "SI=F": "銀先物",
    "NG=F": "天然ガス先物",
  },

  zh: {
    ...COMMON_MARKET_NAMES,

    "^GSPC": "标普500",
    "^IXIC": "纳斯达克综合",
    "^DJI": "道琼斯工业平均",
    "^RUT": "罗素2000",
    "^GSPTSE": "标普/多伦多综合",
    "^BVSP": "巴西圣保罗指数",
    "^N225": "日经225",
    TOPIX: "东证股价指数",
    "000001.SS": "上证综指",
    "000300.SS": "沪深300",
    "^HSI": "恒生指数",
    "^NSEI": "印度Nifty 50",
    "^TWII": "台湾加权",
    "^KS11": "韩国综合股价指数",
    "^AXJO": "标普/澳证200",
    "^STI": "海峡时报指数",
    "^JKSE": "雅加达综合",
    "^STOXX50E": "欧洲斯托克50",
    "^GDAXI": "德国DAX",
    "^FTSE": "富时100",
    "^FCHI": "法国CAC 40",
    "FTSEMIB.MI": "富时MIB",
    "^SSMI": "瑞士市场指数",
    "^IBEX": "西班牙IBEX 35",
    "^AEX": "荷兰AEX",
    "^OMX": "OMX斯德哥尔摩30",
    "^TASI.SR": "沙特全股指数",
    "^JN0U.JO": "南非Top 40",

    "BTC-USD": "比特币",
    "ETH-USD": "以太坊",
    "USDT-USD": "泰达币",
    "USDC-USD": "USD Coin",
    "BNB-USD": "BNB",
    "SOL-USD": "索拉纳",
    "XRP-USD": "XRP",
    "TRX-USD": "波场",
    "DOGE-USD": "狗狗币",
    "ADA-USD": "卡尔达诺",

    "CL=F": "原油期货",
    "GC=F": "黄金期货",
    "SI=F": "白银期货",
    "NG=F": "天然气期货",
  },

  de: {
    ...COMMON_MARKET_NAMES,

    "^IXIC": "Nasdaq Composite",
    "^DJI": "Dow Jones Industrial Average",
    "^GSPTSE": "S&P/TSX Composite",
    "^BVSP": "Bovespa",
    "000001.SS": "Shanghai Composite",
    "^HSI": "Hang Seng",
    "^STI": "Straits Times",
    "^JKSE": "IDX Composite",
    "^SSMI": "Swiss Market Index",
    "^OMX": "OMX Stockholm 30",
    "^TASI.SR": "Tadawul All Share",
    "^JN0U.JO": "Südafrika Top 40",

    "CL=F": "Rohöl-Futures",
    "GC=F": "Gold-Futures",
    "SI=F": "Silber-Futures",
    "NG=F": "Erdgas-Futures",
  },

  fr: {
    ...COMMON_MARKET_NAMES,

    "^IXIC": "Nasdaq Composite",
    "^DJI": "Dow Jones Industrial Average",
    "^GSPTSE": "S&P/TSX composé",
    "^BVSP": "Bovespa",
    "000001.SS": "Indice composite de Shanghai",
    "^HSI": "Hang Seng",
    "^STI": "Straits Times",
    "^JKSE": "Indice composite IDX",
    "^SSMI": "Swiss Market Index",
    "^OMX": "OMX Stockholm 30",
    "^TASI.SR": "Tadawul All Share",
    "^JN0U.JO": "Afrique du Sud Top 40",

    "CL=F": "Contrats à terme sur le pétrole brut",
    "GC=F": "Contrats à terme sur l’or",
    "SI=F": "Contrats à terme sur l’argent",
    "NG=F": "Contrats à terme sur le gaz naturel",
  },

  es: {
    ...COMMON_MARKET_NAMES,

    "^IXIC": "Nasdaq Composite",
    "^DJI": "Dow Jones Industrial Average",
    "^GSPTSE": "S&P/TSX compuesto",
    "^BVSP": "Bovespa",
    "000001.SS": "Índice compuesto de Shanghái",
    "^HSI": "Hang Seng",
    "^STI": "Straits Times",
    "^JKSE": "Índice compuesto IDX",
    "^SSMI": "Índice del mercado suizo",
    "^OMX": "OMX Estocolmo 30",
    "^TASI.SR": "Tadawul All Share",
    "^JN0U.JO": "Sudáfrica Top 40",

    "CL=F": "Futuros de petróleo crudo",
    "GC=F": "Futuros de oro",
    "SI=F": "Futuros de plata",
    "NG=F": "Futuros de gas natural",
  },

  pt: {
    ...COMMON_MARKET_NAMES,

    "^IXIC": "Nasdaq Composite",
    "^DJI": "Dow Jones Industrial Average",
    "^GSPTSE": "S&P/TSX composto",
    "^BVSP": "Ibovespa",
    "000001.SS": "Índice composto de Xangai",
    "^HSI": "Hang Seng",
    "^STI": "Straits Times",
    "^JKSE": "Índice composto IDX",
    "^SSMI": "Índice do mercado suíço",
    "^OMX": "OMX Estocolmo 30",
    "^TASI.SR": "Tadawul All Share",
    "^JN0U.JO": "África do Sul Top 40",

    "CL=F": "Futuros de petróleo bruto",
    "GC=F": "Futuros de ouro",
    "SI=F": "Futuros de prata",
    "NG=F": "Futuros de gás natural",
  },

  it: {
    ...COMMON_MARKET_NAMES,

    "^IXIC": "Nasdaq Composite",
    "^DJI": "Dow Jones Industrial Average",
    "^GSPTSE": "S&P/TSX composito",
    "^BVSP": "Bovespa",
    "000001.SS": "Indice composito di Shanghai",
    "^HSI": "Hang Seng",
    "^STI": "Straits Times",
    "^JKSE": "Indice composito IDX",
    "^SSMI": "Indice del mercato svizzero",
    "^OMX": "OMX Stoccolma 30",
    "^TASI.SR": "Tadawul All Share",
    "^JN0U.JO": "Sudafrica Top 40",

    "CL=F": "Futures sul petrolio greggio",
    "GC=F": "Futures sull’oro",
    "SI=F": "Futures sull’argento",
    "NG=F": "Futures sul gas naturale",
  },

  ru: {
    ...COMMON_MARKET_NAMES,

    "^IXIC": "Индекс Nasdaq Composite",
    "^DJI": "Промышленный индекс Доу Джонса",
    "^RUT": "Расселл 2000",
    "^GSPTSE": "Составной индекс S&P/TSX",
    "^BVSP": "Индекс Бовеспа",
    "^N225": "Никкей 225",
    "000001.SS": "Шанхайский составной индекс",
    "^HSI": "Ханг Сенг",
    "^NSEI": "Нифти 50",
    "^TWII": "Взвешенный индекс Тайваня",
    "^STI": "Стрейтс Таймс",
    "^JKSE": "Составной индекс IDX",
    "^SSMI": "Индекс швейцарского рынка",
    "^OMX": "OMX Стокгольм 30",
    "^TASI.SR": "Общий индекс Тадавул",
    "^JN0U.JO": "ЮАР Top 40",

    "BTC-USD": "Биткоин",
    "ETH-USD": "Эфириум",
    "USDT-USD": "Тезер",
    "SOL-USD": "Солана",
    "TRX-USD": "Трон",
    "DOGE-USD": "Догекоин",
    "ADA-USD": "Кардано",

    "CL=F": "Фьючерсы на нефть",
    "GC=F": "Фьючерсы на золото",
    "SI=F": "Фьючерсы на серебро",
    "NG=F": "Фьючерсы на природный газ",
  },

  ar: {
    ...COMMON_MARKET_NAMES,

    "^GSPC": "ستاندرد آند بورز 500",
    "^IXIC": "ناسداك المركب",
    "^DJI": "داو جونز الصناعي",
    "^RUT": "راسل 2000",
    "^GSPTSE": "S&P/TSX المركب",
    "^BVSP": "بوفيسبا",
    "^N225": "نيكي 225",
    TOPIX: "توبكس",
    "000001.SS": "مؤشر شنغهاي المركب",
    "^HSI": "هانغ سنغ",
    "^NSEI": "نيفتي 50",
    "^TWII": "مؤشر تايوان المرجح",
    "^KS11": "كوسبي",
    "^STI": "ستريتس تايمز",
    "^JKSE": "مؤشر IDX المركب",
    "^STOXX50E": "يورو ستوكس 50",
    "^GDAXI": "داكس",
    "^FTSE": "فوتسي 100",
    "^FCHI": "كاك 40",
    "^SSMI": "مؤشر السوق السويسرية",
    "^OMX": "OMX ستوكهولم 30",
    "^TASI.SR": "مؤشر تداول العام",
    "^JN0U.JO": "جنوب أفريقيا Top 40",

    "BTC-USD": "بيتكوين",
    "ETH-USD": "إيثريوم",
    "USDT-USD": "تيثر",
    "USDC-USD": "يو إس دي كوين",
    "SOL-USD": "سولانا",
    "TRX-USD": "ترون",
    "DOGE-USD": "دوجكوين",
    "ADA-USD": "كاردانو",

    "CL=F": "العقود الآجلة للنفط الخام",
    "GC=F": "العقود الآجلة للذهب",
    "SI=F": "العقود الآجلة للفضة",
    "NG=F": "العقود الآجلة للغاز الطبيعي",
  },

  hi: {
    ...COMMON_MARKET_NAMES,

    "^IXIC": "नैस्डैक कंपोज़िट",
    "^DJI": "डाउ जोन्स औद्योगिक औसत",
    "^RUT": "रसेल 2000",
    "^GSPTSE": "S&P/TSX कंपोज़िट",
    "^BVSP": "बोवेस्पा",
    "^N225": "निक्केई 225",
    TOPIX: "टॉपिक्स",
    "000001.SS": "शंघाई कंपोज़िट",
    "^HSI": "हैंग सेंग",
    "^NSEI": "निफ्टी 50",
    "^TWII": "ताइवान भारित सूचकांक",
    "^KS11": "कोस्पी",
    "^STI": "स्ट्रेट्स टाइम्स",
    "^JKSE": "IDX कंपोज़िट",
    "^STOXX50E": "यूरो स्टॉक्स 50",
    "^SSMI": "स्विस बाज़ार सूचकांक",
    "^OMX": "OMX स्टॉकहोम 30",
    "^TASI.SR": "तदावुल ऑल शेयर",
    "^JN0U.JO": "दक्षिण अफ़्रीका Top 40",

    "BTC-USD": "बिटकॉइन",
    "ETH-USD": "ईथेरियम",
    "USDT-USD": "टेथर",
    "USDC-USD": "यूएसडी कॉइन",
    "SOL-USD": "सोलाना",
    "TRX-USD": "ट्रॉन",
    "DOGE-USD": "डॉजकॉइन",
    "ADA-USD": "कार्डानो",

    "CL=F": "कच्चे तेल के वायदा",
    "GC=F": "सोने के वायदा",
    "SI=F": "चाँदी के वायदा",
    "NG=F": "प्राकृतिक गैस के वायदा",
  },
};

export const MARKET_PICKER_LABELS: Record<
  Language,
  {
    added: string;
    groups: Record<string, string>;
  }
> = {
  en: {
    added: "Added",
    groups: {
      america: "America",
      asia: "Asia",
      europe: "Europe",
      middle_east: "Middle East",
      africa: "Africa",
      crypto: "Crypto",
      currency: "Currencies",
      commodity: "Commodities",
    },
  },
  ko: {
    added: "추가됨",
    groups: {
      america: "아메리카",
      asia: "아시아",
      europe: "유럽",
      middle_east: "중동",
      africa: "아프리카",
      crypto: "암호화폐",
      currency: "통화",
      commodity: "원자재",
    },
  },
  ja: {
    added: "追加済み",
    groups: {
      america: "アメリカ",
      asia: "アジア",
      europe: "ヨーロッパ",
      middle_east: "中東",
      africa: "アフリカ",
      crypto: "暗号資産",
      currency: "通貨",
      commodity: "商品",
    },
  },
  zh: {
    added: "已添加",
    groups: {
      america: "美洲",
      asia: "亚洲",
      europe: "欧洲",
      middle_east: "中东",
      africa: "非洲",
      crypto: "加密货币",
      currency: "货币",
      commodity: "大宗商品",
    },
  },
  de: {
    added: "Hinzugefügt",
    groups: {
      america: "Amerika",
      asia: "Asien",
      europe: "Europa",
      middle_east: "Naher Osten",
      africa: "Afrika",
      crypto: "Kryptowährungen",
      currency: "Währungen",
      commodity: "Rohstoffe",
    },
  },
  fr: {
    added: "Ajouté",
    groups: {
      america: "Amériques",
      asia: "Asie",
      europe: "Europe",
      middle_east: "Moyen-Orient",
      africa: "Afrique",
      crypto: "Cryptomonnaies",
      currency: "Devises",
      commodity: "Matières premières",
    },
  },
  es: {
    added: "Añadido",
    groups: {
      america: "América",
      asia: "Asia",
      europe: "Europa",
      middle_east: "Oriente Medio",
      africa: "África",
      crypto: "Criptomonedas",
      currency: "Divisas",
      commodity: "Materias primas",
    },
  },
  pt: {
    added: "Adicionado",
    groups: {
      america: "América",
      asia: "Ásia",
      europe: "Europa",
      middle_east: "Oriente Médio",
      africa: "África",
      crypto: "Criptomoedas",
      currency: "Moedas",
      commodity: "Matérias-primas",
    },
  },
  it: {
    added: "Aggiunto",
    groups: {
      america: "America",
      asia: "Asia",
      europe: "Europa",
      middle_east: "Medio Oriente",
      africa: "Africa",
      crypto: "Criptovalute",
      currency: "Valute",
      commodity: "Materie prime",
    },
  },
  ru: {
    added: "Добавлено",
    groups: {
      america: "Америка",
      asia: "Азия",
      europe: "Европа",
      middle_east: "Ближний Восток",
      africa: "Африка",
      crypto: "Криптовалюты",
      currency: "Валюты",
      commodity: "Сырьевые товары",
    },
  },
  ar: {
    added: "مضاف",
    groups: {
      america: "الأمريكتان",
      asia: "آسيا",
      europe: "أوروبا",
      middle_east: "الشرق الأوسط",
      africa: "أفريقيا",
      crypto: "العملات المشفرة",
      currency: "العملات",
      commodity: "السلع",
    },
  },
  hi: {
    added: "जोड़ा गया",
    groups: {
      america: "अमेरिका",
      asia: "एशिया",
      europe: "यूरोप",
      middle_east: "मध्य पूर्व",
      africa: "अफ़्रीका",
      crypto: "क्रिप्टो",
      currency: "मुद्राएँ",
      commodity: "कमोडिटी",
    },
  },
};

export const HOME_COMMUNITY_LABELS: Record<
  Language,
  {
    all_markets: string;
    filter_markets: string;
    sort_discussions: string;
    latest: string;
    most_liked: string;
    loading: string;
    loading_discussions: string;
    load_failed: string;
    load_more_failed: string;
    retry: string;
    empty: string;
    share_market: string;
    share_view: string;
    view_more: string;
  }
> = {
  en: {
    all_markets: "All markets",
    filter_markets: "Filter discussions by market",
    sort_discussions: "Sort discussions",
    latest: "Latest",
    most_liked: "Most liked",
    loading: "Loading...",
    loading_discussions: "Loading discussions...",
    load_failed: "Could not load discussions.",
    load_more_failed: "Could not load more discussions.",
    retry: "Try again",
    empty: "No discussions yet.",
    share_market: "Share your view on {market}.",
    share_view: "Share your view and start the conversation.",
    view_more: "View more discussions",
  },
  ko: {
    all_markets: "전체 시장",
    filter_markets: "시장별 게시글 필터",
    sort_discussions: "게시글 정렬",
    latest: "최신순",
    most_liked: "좋아요순",
    loading: "불러오는 중...",
    loading_discussions: "게시글을 불러오는 중...",
    load_failed: "게시글을 불러오지 못했습니다.",
    load_more_failed: "추가 게시글을 불러오지 못했습니다.",
    retry: "다시 시도",
    empty: "아직 게시글이 없습니다.",
    share_market: "{market}에 대한 의견을 남겨보세요.",
    share_view: "의견을 남기고 대화를 시작해보세요.",
    view_more: "게시글 더 보기",
  },
  ja: {
    all_markets: "すべての市場",
    filter_markets: "市場別に投稿を絞り込む",
    sort_discussions: "投稿の並び替え",
    latest: "新着順",
    most_liked: "いいね順",
    loading: "読み込み中...",
    loading_discussions: "投稿を読み込み中...",
    load_failed: "投稿を読み込めませんでした。",
    load_more_failed: "追加の投稿を読み込めませんでした。",
    retry: "再試行",
    empty: "まだ投稿がありません。",
    share_market: "{market}について意見を投稿しましょう。",
    share_view: "意見を投稿して会話を始めましょう。",
    view_more: "投稿をもっと見る",
  },
  zh: {
    all_markets: "全部市场",
    filter_markets: "按市场筛选帖子",
    sort_discussions: "帖子排序",
    latest: "最新",
    most_liked: "最多点赞",
    loading: "加载中...",
    loading_discussions: "正在加载帖子...",
    load_failed: "无法加载帖子。",
    load_more_failed: "无法加载更多帖子。",
    retry: "重试",
    empty: "暂无帖子。",
    share_market: "分享你对{market}的看法。",
    share_view: "分享你的看法，开启讨论。",
    view_more: "查看更多帖子",
  },
  de: {
    all_markets: "Alle Märkte",
    filter_markets: "Beiträge nach Markt filtern",
    sort_discussions: "Beiträge sortieren",
    latest: "Neueste",
    most_liked: "Meiste Likes",
    loading: "Wird geladen...",
    loading_discussions: "Beiträge werden geladen...",
    load_failed: "Beiträge konnten nicht geladen werden.",
    load_more_failed: "Weitere Beiträge konnten nicht geladen werden.",
    retry: "Erneut versuchen",
    empty: "Noch keine Beiträge.",
    share_market: "Teile deine Meinung zu {market}.",
    share_view: "Teile deine Meinung und starte eine Diskussion.",
    view_more: "Weitere Beiträge anzeigen",
  },
  fr: {
    all_markets: "Tous les marchés",
    filter_markets: "Filtrer les publications par marché",
    sort_discussions: "Trier les publications",
    latest: "Plus récentes",
    most_liked: "Plus aimées",
    loading: "Chargement...",
    loading_discussions: "Chargement des publications...",
    load_failed: "Impossible de charger les publications.",
    load_more_failed: "Impossible de charger davantage de publications.",
    retry: "Réessayer",
    empty: "Aucune publication pour le moment.",
    share_market: "Partagez votre avis sur {market}.",
    share_view: "Partagez votre avis et lancez la discussion.",
    view_more: "Voir plus de publications",
  },
  es: {
    all_markets: "Todos los mercados",
    filter_markets: "Filtrar publicaciones por mercado",
    sort_discussions: "Ordenar publicaciones",
    latest: "Más recientes",
    most_liked: "Más Me gusta",
    loading: "Cargando...",
    loading_discussions: "Cargando publicaciones...",
    load_failed: "No se pudieron cargar las publicaciones.",
    load_more_failed: "No se pudieron cargar más publicaciones.",
    retry: "Reintentar",
    empty: "Aún no hay publicaciones.",
    share_market: "Comparte tu opinión sobre {market}.",
    share_view: "Comparte tu opinión e inicia la conversación.",
    view_more: "Ver más publicaciones",
  },
  pt: {
    all_markets: "Todos os mercados",
    filter_markets: "Filtrar publicações por mercado",
    sort_discussions: "Ordenar publicações",
    latest: "Mais recentes",
    most_liked: "Mais curtidas",
    loading: "Carregando...",
    loading_discussions: "Carregando publicações...",
    load_failed: "Não foi possível carregar as publicações.",
    load_more_failed: "Não foi possível carregar mais publicações.",
    retry: "Tentar novamente",
    empty: "Ainda não há publicações.",
    share_market: "Compartilhe sua opinião sobre {market}.",
    share_view: "Compartilhe sua opinião e inicie a conversa.",
    view_more: "Ver mais publicações",
  },
  it: {
    all_markets: "Tutti i mercati",
    filter_markets: "Filtra i post per mercato",
    sort_discussions: "Ordina i post",
    latest: "Più recenti",
    most_liked: "Più apprezzati",
    loading: "Caricamento...",
    loading_discussions: "Caricamento dei post...",
    load_failed: "Impossibile caricare i post.",
    load_more_failed: "Impossibile caricare altri post.",
    retry: "Riprova",
    empty: "Ancora nessun post.",
    share_market: "Condividi la tua opinione su {market}.",
    share_view: "Condividi la tua opinione e avvia la conversazione.",
    view_more: "Mostra altri post",
  },
  ru: {
    all_markets: "Все рынки",
    filter_markets: "Фильтровать публикации по рынку",
    sort_discussions: "Сортировать публикации",
    latest: "Новые",
    most_liked: "Больше лайков",
    loading: "Загрузка...",
    loading_discussions: "Загрузка публикаций...",
    load_failed: "Не удалось загрузить публикации.",
    load_more_failed: "Не удалось загрузить больше публикаций.",
    retry: "Повторить",
    empty: "Публикаций пока нет.",
    share_market: "Поделитесь мнением о {market}.",
    share_view: "Поделитесь мнением и начните обсуждение.",
    view_more: "Показать больше публикаций",
  },
  ar: {
    all_markets: "جميع الأسواق",
    filter_markets: "تصفية المنشورات حسب السوق",
    sort_discussions: "ترتيب المنشورات",
    latest: "الأحدث",
    most_liked: "الأكثر إعجابًا",
    loading: "جارٍ التحميل...",
    loading_discussions: "جارٍ تحميل المنشورات...",
    load_failed: "تعذّر تحميل المنشورات.",
    load_more_failed: "تعذّر تحميل المزيد من المنشورات.",
    retry: "حاول مرة أخرى",
    empty: "لا توجد منشورات بعد.",
    share_market: "شارك رأيك حول {market}.",
    share_view: "شارك رأيك وابدأ النقاش.",
    view_more: "عرض المزيد من المنشورات",
  },
  hi: {
    all_markets: "सभी बाज़ार",
    filter_markets: "बाज़ार के अनुसार पोस्ट फ़िल्टर करें",
    sort_discussions: "पोस्ट क्रमबद्ध करें",
    latest: "नवीनतम",
    most_liked: "सबसे अधिक पसंद",
    loading: "लोड हो रहा है...",
    loading_discussions: "पोस्ट लोड हो रही हैं...",
    load_failed: "पोस्ट लोड नहीं हो सकीं।",
    load_more_failed: "और पोस्ट लोड नहीं हो सकीं।",
    retry: "फिर से कोशिश करें",
    empty: "अभी तक कोई पोस्ट नहीं है।",
    share_market: "{market} पर अपनी राय साझा करें।",
    share_view: "अपनी राय साझा करें और बातचीत शुरू करें।",
    view_more: "और पोस्ट देखें",
  },
};

export const HOME_LABELS: Record<
  Language,
  {
    dashboard: string;
    watchlist: string;
    community: string;
    predict: string;
    share_view: string;
  }
> = {
  en: {
    dashboard: "Global market dashboard",
    watchlist: "Watchlist",
    community: "Community",
    predict: "Make accurate predictions and climb the leaderboard.",
    share_view: "Share your view and start the conversation",
  },
  ko: {
    dashboard: "글로벌 시장 대시보드",
    watchlist: "관심 목록",
    community: "커뮤니티",
    predict: "예측을 맞히고 리더보드 상위권에 도전하세요.",
    share_view: "의견을 남기고 대화를 시작해보세요",
  },
  ja: {
    dashboard: "世界の市場ダッシュボード",
    watchlist: "ウォッチリスト",
    community: "コミュニティ",
    predict: "予測を的中させて、リーダーボードの上位を目指しましょう。",
    share_view: "意見を投稿して会話を始めましょう",
  },
  zh: {
    dashboard: "全球市场看板",
    watchlist: "自选列表",
    community: "社区",
    predict: "准确预测，向排行榜前列发起挑战。",
    share_view: "分享你的看法，开启讨论",
  },
  de: {
    dashboard: "Globale Marktübersicht",
    watchlist: "Watchlist",
    community: "Community",
    predict: "Triff richtige Prognosen und steige in der Rangliste auf.",
    share_view: "Teile deine Meinung und starte eine Diskussion",
  },
  fr: {
    dashboard: "Tableau de bord des marchés mondiaux",
    watchlist: "Liste de suivi",
    community: "Communauté",
    predict: "Faites des prévisions justes et grimpez dans le classement.",
    share_view: "Partagez votre avis et lancez la discussion",
  },
  es: {
    dashboard: "Panel de mercados globales",
    watchlist: "Lista de seguimiento",
    community: "Comunidad",
    predict: "Acierta tus predicciones y sube en la clasificación.",
    share_view: "Comparte tu opinión e inicia la conversación",
  },
  pt: {
    dashboard: "Painel de mercados globais",
    watchlist: "Lista de acompanhamento",
    community: "Comunidade",
    predict: "Acerte suas previsões e suba no ranking.",
    share_view: "Compartilhe sua opinião e inicie a conversa",
  },
  it: {
    dashboard: "Panoramica dei mercati globali",
    watchlist: "Lista di monitoraggio",
    community: "Community",
    predict: "Fai previsioni corrette e scala la classifica.",
    share_view: "Condividi la tua opinione e avvia la conversazione",
  },
  ru: {
    dashboard: "Обзор мировых рынков",
    watchlist: "Список наблюдения",
    community: "Сообщество",
    predict: "Делайте точные прогнозы и поднимайтесь в рейтинге.",
    share_view: "Поделитесь мнением и начните обсуждение",
  },
  ar: {
    dashboard: "لوحة الأسواق العالمية",
    watchlist: "قائمة المتابعة",
    community: "المجتمع",
    predict: "قدّم توقعات دقيقة وتقدّم في لوحة المتصدرين.",
    share_view: "شارك رأيك وابدأ النقاش",
  },
  hi: {
    dashboard: "वैश्विक बाज़ार डैशबोर्ड",
    watchlist: "वॉचलिस्ट",
    community: "समुदाय",
    predict: "सही पूर्वानुमान लगाएँ और लीडरबोर्ड में ऊपर बढ़ें।",
    share_view: "अपनी राय साझा करें और बातचीत शुरू करें",
  },
};

export const SEARCH_LABELS: Record<
  Language,
  {
    placeholder: string;
    search_markets: string;
    results: string;
  }
> = {
  en: {
    placeholder: "Search...",
    search_markets: "Search markets",
    results: "Market search results",
  },
  ko: {
    placeholder: "검색...",
    search_markets: "시장 검색",
    results: "시장 검색 결과",
  },
  ja: {
    placeholder: "検索...",
    search_markets: "市場を検索",
    results: "市場の検索結果",
  },
  zh: {
    placeholder: "搜索...",
    search_markets: "搜索市场",
    results: "市场搜索结果",
  },
  de: {
    placeholder: "Suchen...",
    search_markets: "Märkte suchen",
    results: "Marktsuchergebnisse",
  },
  fr: {
    placeholder: "Rechercher...",
    search_markets: "Rechercher des marchés",
    results: "Résultats de recherche des marchés",
  },
  es: {
    placeholder: "Buscar...",
    search_markets: "Buscar mercados",
    results: "Resultados de búsqueda de mercados",
  },
  pt: {
    placeholder: "Pesquisar...",
    search_markets: "Pesquisar mercados",
    results: "Resultados da pesquisa de mercados",
  },
  it: {
    placeholder: "Cerca...",
    search_markets: "Cerca mercati",
    results: "Risultati della ricerca dei mercati",
  },
  ru: {
    placeholder: "Поиск...",
    search_markets: "Поиск рынков",
    results: "Результаты поиска рынков",
  },
  ar: {
    placeholder: "بحث...",
    search_markets: "البحث عن الأسواق",
    results: "نتائج البحث عن الأسواق",
  },
  hi: {
    placeholder: "खोजें...",
    search_markets: "बाज़ार खोजें",
    results: "बाज़ार खोज परिणाम",
  },
};

export const MARKET_TABLE_LABELS: Record<
  Language,
  {
    asset: string;
    trend: string;
    today: string;
    prev: string;
    percent: string;
    change: string;
    statistics: string;
    vote: string;
  }
> = {
  en: {
    asset: "Asset",
    trend: "Trend",
    today: "Today",
    prev: "Prev",
    percent: "24h %",
    change: "Change",
    statistics: "Statistics",
    vote: "Vote",
  },
  ko: {
    asset: "자산",
    trend: "추세",
    today: "현재가",
    prev: "전일 종가",
    percent: "24시간 %",
    change: "등락",
    statistics: "통계",
    vote: "투표",
  },
  ja: {
    asset: "資産",
    trend: "推移",
    today: "現在値",
    prev: "前日終値",
    percent: "24時間 %",
    change: "前日比",
    statistics: "統計",
    vote: "投票",
  },
  zh: {
    asset: "资产",
    trend: "走势",
    today: "现价",
    prev: "前收盘",
    percent: "24小时 %",
    change: "涨跌",
    statistics: "统计",
    vote: "投票",
  },
  de: {
    asset: "Anlage",
    trend: "Trend",
    today: "Heute",
    prev: "Vortag",
    percent: "24 Std. %",
    change: "Änderung",
    statistics: "Statistik",
    vote: "Abstimmung",
  },
  fr: {
    asset: "Actif",
    trend: "Tendance",
    today: "Aujourd’hui",
    prev: "Clôture préc.",
    percent: "24 h %",
    change: "Variation",
    statistics: "Statistiques",
    vote: "Vote",
  },
  es: {
    asset: "Activo",
    trend: "Tendencia",
    today: "Hoy",
    prev: "Cierre ant.",
    percent: "24 h %",
    change: "Cambio",
    statistics: "Estadísticas",
    vote: "Voto",
  },
  pt: {
    asset: "Ativo",
    trend: "Tendência",
    today: "Hoje",
    prev: "Fech. ant.",
    percent: "24 h %",
    change: "Variação",
    statistics: "Estatísticas",
    vote: "Voto",
  },
  it: {
    asset: "Attività",
    trend: "Andamento",
    today: "Oggi",
    prev: "Chiusura prec.",
    percent: "24 h %",
    change: "Variazione",
    statistics: "Statistiche",
    vote: "Voto",
  },
  ru: {
    asset: "Актив",
    trend: "Тренд",
    today: "Сегодня",
    prev: "Пред. закр.",
    percent: "24 ч %",
    change: "Изменение",
    statistics: "Статистика",
    vote: "Голосование",
  },
  ar: {
    asset: "الأصل",
    trend: "الاتجاه",
    today: "اليوم",
    prev: "الإغلاق السابق",
    percent: "24 ساعة %",
    change: "التغير",
    statistics: "الإحصاءات",
    vote: "التصويت",
  },
  hi: {
    asset: "परिसंपत्ति",
    trend: "रुझान",
    today: "आज",
    prev: "पिछला बंद",
    percent: "24 घंटे %",
    change: "बदलाव",
    statistics: "आँकड़े",
    vote: "मतदान",
  },
};

export const PANEL_LEFT_LABELS: Record<
  Language,
  {
    popular_boards: string;
    most_liked_comments: string;
    no_comments: string;
  }
> = {
  en: {
    popular_boards: "Popular boards",
    most_liked_comments: "Most liked comments",
    no_comments: "No comments yet.",
  },
  ko: {
    popular_boards: "인기 게시판",
    most_liked_comments: "인기 댓글",
    no_comments: "댓글 없음",
  },
  ja: {
    popular_boards: "人気の掲示板",
    most_liked_comments: "人気のコメント",
    no_comments: "コメントなし",
  },
  zh: {
    popular_boards: "热门讨论区",
    most_liked_comments: "热门评论",
    no_comments: "暂无评论",
  },
  de: {
    popular_boards: "Beliebte Foren",
    most_liked_comments: "Beliebte Kommentare",
    no_comments: "Keine Kommentare",
  },
  fr: {
    popular_boards: "Forums populaires",
    most_liked_comments: "Commentaires populaires",
    no_comments: "Aucun commentaire",
  },
  es: {
    popular_boards: "Foros populares",
    most_liked_comments: "Comentarios populares",
    no_comments: "Sin comentarios",
  },
  pt: {
    popular_boards: "Fóruns populares",
    most_liked_comments: "Comentários populares",
    no_comments: "Sem comentários",
  },
  it: {
    popular_boards: "Forum popolari",
    most_liked_comments: "Commenti popolari",
    no_comments: "Nessun commento",
  },
  ru: {
    popular_boards: "Популярные форумы",
    most_liked_comments: "Популярные комментарии",
    no_comments: "Нет комментариев",
  },
  ar: {
    popular_boards: "المنتديات الرائجة",
    most_liked_comments: "التعليقات الرائجة",
    no_comments: "لا تعليقات",
  },
  hi: {
    popular_boards: "लोकप्रिय फ़ोरम",
    most_liked_comments: "लोकप्रिय टिप्पणियाँ",
    no_comments: "कोई टिप्पणी नहीं",
  },
};

export const NAVBAR_LABELS: Record<
  Language,
  {
    close_search: string;
    toggle_sidebar: string;
    login: string;
    user_menu: string;
    unread_menu: string;
    notifications: string;
    settings: string;
    mode: string;
    signing_out: string;
    sign_out: string;
    admin: string;
  }
> = {
  en: {
    close_search: "Close search",
    toggle_sidebar: "Toggle sidebar",
    login: "Log in",
    user_menu: "User menu",
    unread_menu: "User menu, {count} unread notifications",
    notifications: "Notifications",
    settings: "Settings",
    mode: "Mode",
    signing_out: "Signing out...",
    sign_out: "Sign out",
    admin: "Admin",
  },
  ko: {
    close_search: "검색 닫기",
    toggle_sidebar: "사이드바 열기 또는 닫기",
    login: "로그인",
    user_menu: "사용자 메뉴",
    unread_menu: "사용자 메뉴, 읽지 않은 알림 {count}개",
    notifications: "알림",
    settings: "설정",
    mode: "화면 모드",
    signing_out: "로그아웃 중...",
    sign_out: "로그아웃",
    admin: "관리자",
  },
  ja: {
    close_search: "検索を閉じる",
    toggle_sidebar: "サイドバーの開閉",
    login: "ログイン",
    user_menu: "ユーザーメニュー",
    unread_menu: "ユーザーメニュー、未読通知{count}件",
    notifications: "通知",
    settings: "設定",
    mode: "表示モード",
    signing_out: "ログアウト中...",
    sign_out: "ログアウト",
    admin: "管理者",
  },
  zh: {
    close_search: "关闭搜索",
    toggle_sidebar: "展开或收起侧栏",
    login: "登录",
    user_menu: "用户菜单",
    unread_menu: "用户菜单，{count}条未读通知",
    notifications: "通知",
    settings: "设置",
    mode: "显示模式",
    signing_out: "正在退出...",
    sign_out: "退出登录",
    admin: "管理",
  },
  de: {
    close_search: "Suche schließen",
    toggle_sidebar: "Seitenleiste ein-/ausblenden",
    login: "Anmelden",
    user_menu: "Benutzermenü",
    unread_menu: "Benutzermenü, {count} ungelesene Benachrichtigungen",
    notifications: "Benachrichtigungen",
    settings: "Einstellungen",
    mode: "Darstellung",
    signing_out: "Abmelden...",
    sign_out: "Abmelden",
    admin: "Verwaltung",
  },
  fr: {
    close_search: "Fermer la recherche",
    toggle_sidebar: "Afficher ou masquer le panneau latéral",
    login: "Connexion",
    user_menu: "Menu utilisateur",
    unread_menu: "Menu utilisateur, {count} notifications non lues",
    notifications: "Notifications",
    settings: "Paramètres",
    mode: "Apparence",
    signing_out: "Déconnexion...",
    sign_out: "Déconnexion",
    admin: "Administration",
  },
  es: {
    close_search: "Cerrar búsqueda",
    toggle_sidebar: "Mostrar u ocultar la barra lateral",
    login: "Iniciar sesión",
    user_menu: "Menú de usuario",
    unread_menu: "Menú de usuario, {count} notificaciones sin leer",
    notifications: "Notificaciones",
    settings: "Ajustes",
    mode: "Apariencia",
    signing_out: "Cerrando sesión...",
    sign_out: "Cerrar sesión",
    admin: "Administración",
  },
  pt: {
    close_search: "Fechar pesquisa",
    toggle_sidebar: "Mostrar ou ocultar a barra lateral",
    login: "Entrar",
    user_menu: "Menu do usuário",
    unread_menu: "Menu do usuário, {count} notificações não lidas",
    notifications: "Notificações",
    settings: "Configurações",
    mode: "Aparência",
    signing_out: "Saindo...",
    sign_out: "Sair",
    admin: "Administração",
  },
  it: {
    close_search: "Chiudi ricerca",
    toggle_sidebar: "Mostra o nascondi la barra laterale",
    login: "Accedi",
    user_menu: "Menu utente",
    unread_menu: "Menu utente, {count} notifiche non lette",
    notifications: "Notifiche",
    settings: "Impostazioni",
    mode: "Aspetto",
    signing_out: "Disconnessione...",
    sign_out: "Esci",
    admin: "Amministrazione",
  },
  ru: {
    close_search: "Закрыть поиск",
    toggle_sidebar: "Показать или скрыть боковую панель",
    login: "Войти",
    user_menu: "Меню пользователя",
    unread_menu: "Меню пользователя, непрочитанных уведомлений: {count}",
    notifications: "Уведомления",
    settings: "Настройки",
    mode: "Оформление",
    signing_out: "Выход...",
    sign_out: "Выйти",
    admin: "Администрирование",
  },
  ar: {
    close_search: "إغلاق البحث",
    toggle_sidebar: "إظهار أو إخفاء الشريط الجانبي",
    login: "تسجيل الدخول",
    user_menu: "قائمة المستخدم",
    unread_menu: "قائمة المستخدم، {count} إشعارات غير مقروءة",
    notifications: "الإشعارات",
    settings: "الإعدادات",
    mode: "المظهر",
    signing_out: "جارٍ تسجيل الخروج...",
    sign_out: "تسجيل الخروج",
    admin: "الإدارة",
  },
  hi: {
    close_search: "खोज बंद करें",
    toggle_sidebar: "साइडबार दिखाएँ या छिपाएँ",
    login: "लॉग इन",
    user_menu: "उपयोगकर्ता मेनू",
    unread_menu: "उपयोगकर्ता मेनू, {count} अपठित सूचनाएँ",
    notifications: "सूचनाएँ",
    settings: "सेटिंग्स",
    mode: "दिखावट",
    signing_out: "लॉग आउट हो रहा है...",
    sign_out: "लॉग आउट",
    admin: "प्रशासन",
  },
};

export const THEME_LABELS: Record<
  Language,
  {
    light: string;
    dark: string;
    toggle: string;
    switch_light: string;
    switch_dark: string;
  }
> = {
  en: {
    light: "Light mode",
    dark: "Dark mode",
    toggle: "Toggle theme",
    switch_light: "Switch to light mode",
    switch_dark: "Switch to dark mode",
  },
  ko: {
    light: "라이트 모드",
    dark: "다크 모드",
    toggle: "테마 변경",
    switch_light: "라이트 모드로 변경",
    switch_dark: "다크 모드로 변경",
  },
  ja: {
    light: "ライトモード",
    dark: "ダークモード",
    toggle: "テーマを切り替える",
    switch_light: "ライトモードに切り替える",
    switch_dark: "ダークモードに切り替える",
  },
  zh: {
    light: "浅色模式",
    dark: "深色模式",
    toggle: "切换主题",
    switch_light: "切换到浅色模式",
    switch_dark: "切换到深色模式",
  },
  de: {
    light: "Heller Modus",
    dark: "Dunkler Modus",
    toggle: "Design wechseln",
    switch_light: "Zum hellen Modus wechseln",
    switch_dark: "Zum dunklen Modus wechseln",
  },
  fr: {
    light: "Mode clair",
    dark: "Mode sombre",
    toggle: "Changer de thème",
    switch_light: "Passer au mode clair",
    switch_dark: "Passer au mode sombre",
  },
  es: {
    light: "Modo claro",
    dark: "Modo oscuro",
    toggle: "Cambiar tema",
    switch_light: "Cambiar al modo claro",
    switch_dark: "Cambiar al modo oscuro",
  },
  pt: {
    light: "Modo claro",
    dark: "Modo escuro",
    toggle: "Alterar tema",
    switch_light: "Mudar para o modo claro",
    switch_dark: "Mudar para o modo escuro",
  },
  it: {
    light: "Modalità chiara",
    dark: "Modalità scura",
    toggle: "Cambia tema",
    switch_light: "Passa alla modalità chiara",
    switch_dark: "Passa alla modalità scura",
  },
  ru: {
    light: "Светлая тема",
    dark: "Тёмная тема",
    toggle: "Сменить тему",
    switch_light: "Включить светлую тему",
    switch_dark: "Включить тёмную тему",
  },
  ar: {
    light: "الوضع الفاتح",
    dark: "الوضع الداكن",
    toggle: "تبديل المظهر",
    switch_light: "التبديل إلى الوضع الفاتح",
    switch_dark: "التبديل إلى الوضع الداكن",
  },
  hi: {
    light: "लाइट मोड",
    dark: "डार्क मोड",
    toggle: "थीम बदलें",
    switch_light: "लाइट मोड में बदलें",
    switch_dark: "डार्क मोड में बदलें",
  },
};

export const LEADERBOARD_LABELS: Record<
  Language,
  {
    title: string;
    me: string;
    accuracy: string;
    points: string;
    empty: string;
  }
> = {
  en: {
    title: "Leaderboard",
    me: "Me",
    accuracy: "Accuracy",
    points: "pts",
    empty: "No ranked traders yet.",
  },
  ko: {
    title: "리더보드",
    me: "나",
    accuracy: "적중률",
    points: "포인트",
    empty: "아직 순위가 없습니다.",
  },
  ja: {
    title: "リーダーボード",
    me: "自分",
    accuracy: "的中率",
    points: "ポイント",
    empty: "まだランキングがありません。",
  },
  zh: {
    title: "排行榜",
    me: "我",
    accuracy: "准确率",
    points: "积分",
    empty: "暂无排名。",
  },
  de: {
    title: "Leaderboard",
    me: "Ich",
    accuracy: "Trefferquote",
    points: "Pkt.",
    empty: "Noch keine Platzierungen.",
  },
  fr: {
    title: "Classement",
    me: "Moi",
    accuracy: "Précision",
    points: "pts",
    empty: "Aucun classement pour le moment.",
  },
  es: {
    title: "Clasificación",
    me: "Yo",
    accuracy: "Aciertos",
    points: "pts",
    empty: "Aún no hay clasificación.",
  },
  pt: {
    title: "Leaderboard",
    me: "Eu",
    accuracy: "Acertos",
    points: "pts",
    empty: "Ainda não há classificação.",
  },
  it: {
    title: "Leaderboard",
    me: "Io",
    accuracy: "Precisione",
    points: "pti",
    empty: "Nessuna classifica per ora.",
  },
  ru: {
    title: "Таблица лидеров",
    me: "Я",
    accuracy: "Точность",
    points: "очки",
    empty: "Пока нет рейтинга.",
  },
  ar: {
    title: "لوحة المتصدرين",
    me: "أنا",
    accuracy: "الدقة",
    points: "نقاط",
    empty: "لا يوجد ترتيب بعد.",
  },
  hi: {
    title: "लीडरबोर्ड",
    me: "मैं",
    accuracy: "सटीकता",
    points: "अंक",
    empty: "अभी कोई रैंकिंग नहीं है।",
  },
};

// lib/data/translations.ts

export const CONTENT_ACTION_LABELS: Record<
  Language,
  {
    actions: string;
    edit: string;
    delete: string;
    deleting: string;
    report: string;
    reporting: string;
    hide: string;
    hiding: string;
    restore: string;
    restoring: string;
  }
> = {
  en: {
    actions: "More options",
    edit: "Edit",
    delete: "Delete",
    deleting: "Deleting...",
    report: "Report",
    reporting: "Reporting...",
    hide: "Hide",
    hiding: "Hiding...",
    restore: "Restore",
    restoring: "Restoring...",
  },
  ko: {
    actions: "더 보기",
    edit: "수정",
    delete: "삭제",
    deleting: "삭제 중...",
    report: "신고",
    reporting: "신고 중...",
    hide: "숨기기",
    hiding: "숨기는 중...",
    restore: "복원",
    restoring: "복원 중...",
  },
  ja: {
    actions: "その他の操作",
    edit: "編集",
    delete: "削除",
    deleting: "削除中...",
    report: "通報",
    reporting: "通報中...",
    hide: "非表示",
    hiding: "非表示にしています...",
    restore: "復元",
    restoring: "復元中...",
  },
  zh: {
    actions: "更多选项",
    edit: "编辑",
    delete: "删除",
    deleting: "删除中...",
    report: "举报",
    reporting: "举报中...",
    hide: "隐藏",
    hiding: "隐藏中...",
    restore: "恢复",
    restoring: "恢复中...",
  },
  de: {
    actions: "Weitere Optionen",
    edit: "Bearbeiten",
    delete: "Löschen",
    deleting: "Wird gelöscht...",
    report: "Melden",
    reporting: "Wird gemeldet...",
    hide: "Ausblenden",
    hiding: "Wird ausgeblendet...",
    restore: "Wiederherstellen",
    restoring: "Wird wiederhergestellt...",
  },
  fr: {
    actions: "Plus d’options",
    edit: "Modifier",
    delete: "Supprimer",
    deleting: "Suppression...",
    report: "Signaler",
    reporting: "Signalement...",
    hide: "Masquer",
    hiding: "Masquage...",
    restore: "Restaurer",
    restoring: "Restauration...",
  },
  es: {
    actions: "Más opciones",
    edit: "Editar",
    delete: "Eliminar",
    deleting: "Eliminando...",
    report: "Denunciar",
    reporting: "Denunciando...",
    hide: "Ocultar",
    hiding: "Ocultando...",
    restore: "Restaurar",
    restoring: "Restaurando...",
  },
  pt: {
    actions: "Mais opções",
    edit: "Editar",
    delete: "Excluir",
    deleting: "Excluindo...",
    report: "Denunciar",
    reporting: "Denunciando...",
    hide: "Ocultar",
    hiding: "Ocultando...",
    restore: "Restaurar",
    restoring: "Restaurando...",
  },
  it: {
    actions: "Altre opzioni",
    edit: "Modifica",
    delete: "Elimina",
    deleting: "Eliminazione...",
    report: "Segnala",
    reporting: "Segnalazione...",
    hide: "Nascondi",
    hiding: "Occultamento...",
    restore: "Ripristina",
    restoring: "Ripristino...",
  },
  ru: {
    actions: "Дополнительные действия",
    edit: "Редактировать",
    delete: "Удалить",
    deleting: "Удаление...",
    report: "Пожаловаться",
    reporting: "Отправка жалобы...",
    hide: "Скрыть",
    hiding: "Скрытие...",
    restore: "Восстановить",
    restoring: "Восстановление...",
  },
  ar: {
    actions: "المزيد من الخيارات",
    edit: "تعديل",
    delete: "حذف",
    deleting: "جارٍ الحذف...",
    report: "إبلاغ",
    reporting: "جارٍ الإبلاغ...",
    hide: "إخفاء",
    hiding: "جارٍ الإخفاء...",
    restore: "استعادة",
    restoring: "جارٍ الاستعادة...",
  },
  hi: {
    actions: "और विकल्प",
    edit: "संपादित करें",
    delete: "हटाएँ",
    deleting: "हटाया जा रहा है...",
    report: "रिपोर्ट करें",
    reporting: "रिपोर्ट की जा रही है...",
    hide: "छिपाएँ",
    hiding: "छिपाया जा रहा है...",
    restore: "पुनर्स्थापित करें",
    restoring: "पुनर्स्थापित किया जा रहा है...",
  },
};
