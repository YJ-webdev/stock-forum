import type { Language } from "@/lib/data/languages";

export interface AboutPageContent {
  intro: string;
  sections: { title: string; paragraphs: string[] }[];
}

export const ABOUT_PAGE_CONTENT: Record<Language, AboutPageContent> = {
  en: {
    intro:
      "A global community to share honest market opinions, explore different perspectives, and make Bull or Bear predictions.",
    sections: [
      {
        title: "What is BullBearVote?",
        paragraphs: [
          "BullBearVote is a place to discuss global markets, including stock indices, currencies, futures, and cryptocurrencies. Explore different viewpoints without needing everyone to agree.",
        ],
      },
      {
        title: "Bull or Bear predictions",
        paragraphs: [
          "Predict whether a supported stock index will rise or fall in its next trading session before the market opens. Predictions are settled using market data, and virtual points count toward the leaderboard.",
        ],
      },
      {
        title: "Open and honest discussions",
        paragraphs: [
          "Share your reasoning, challenge ideas respectfully, and learn from both bullish and bearish perspectives. Follow markets that interest you with your watchlist. No one has to be right every time.",
        ],
      },
      {
        title: "A community, not a brokerage",
        paragraphs: [
          "BullBearVote does not execute trades or offer personalized investment advice. Prediction points have no cash value. Community opinions are not verified facts, and market data may be inaccurate or delayed.",
        ],
      },
    ],
  },
  ko: {
    intro:
      "다양한 시장 전망을 투명하고 솔직하게 공유하고, 서로 다른 관점을 존중하며 상승과 하락을 예측하는 글로벌 커뮤니티입니다.",
    sections: [
      {
        title: "BullBearVote란?",
        paragraphs: [
          "BullBearVote는 주가지수, 외환, 선물, 암호화폐 등 세계 여러 시장에 대한 의견을 나누는 공간입니다. 모두가 같은 생각을 할 필요 없이 다양한 시각을 살펴볼 수 있습니다.",
        ],
      },
      {
        title: "Bull 또는 Bear 예측",
        paragraphs: [
          "지원되는 주가지수의 다음 거래 세션이 시작되기 전에 상승 또는 하락을 예측할 수 있습니다. 결과는 시장 데이터를 기준으로 정산되며 가상 포인트가 리더보드에 반영됩니다.",
        ],
      },
      {
        title: "열린 토론과 솔직한 의견",
        paragraphs: [
          "자신의 판단 근거를 공유하고 서로 다른 의견을 존중하며 토론해 보세요. Bullish와 Bearish 관점 모두 환영합니다. 관심 목록에서 원하는 시장을 팔로우할 수 있습니다. 매번 예측을 맞힐 필요는 없습니다.",
        ],
      },
      {
        title: "투자 중개 서비스가 아닌 커뮤니티",
        paragraphs: [
          "BullBearVote는 거래를 실행하거나 개인 맞춤형 투자 자문을 제공하지 않습니다. 예측 포인트에는 현금 가치가 없습니다. 커뮤니티 의견은 검증된 사실이 아니며 시장 데이터에는 오류나 지연이 있을 수 있습니다.",
        ],
      },
    ],
  },
  ja: {
    intro:
      "率直な市場の見方を共有し、異なる視点を尊重しながら、上昇・下落を予測するグローバルコミュニティです。",
    sections: [
      {
        title: "BullBearVoteとは？",
        paragraphs: [
          "株価指数、為替、先物、暗号資産など、世界の市場について意見を交わす場所です。全員が同じ見方である必要はありません。",
        ],
      },
      {
        title: "Bull・Bear予測",
        paragraphs: [
          "対象の株価指数について、次の取引開始前に上昇か下落かを予測できます。結果は市場データに基づいて確定し、仮想ポイントがランキングに反映されます。",
        ],
      },
      {
        title: "開かれた率直な議論",
        paragraphs: [
          "判断の根拠を共有し、異なる意見にも敬意を持って向き合いましょう。強気も弱気も歓迎です。ウォッチリストで関心のある市場を追跡できます。毎回正解する必要はありません。",
        ],
      },
      {
        title: "証券会社ではなくコミュニティ",
        paragraphs: [
          "BullBearVoteは取引の執行や個別の投資助言を行いません。予測ポイントに現金価値はありません。投稿は検証済みの事実ではなく、市場データには誤りや遅延があり得ます。",
        ],
      },
    ],
  },
  zh: {
    intro: "一个坦诚分享市场观点、尊重不同看法并预测涨跌的全球社区。",
    sections: [
      {
        title: "什么是 BullBearVote？",
        paragraphs: [
          "这里可以讨论全球股指、外汇、期货和加密货币等市场。不同观点都值得倾听，不必人人认同。",
        ],
      },
      {
        title: "看涨或看跌预测",
        paragraphs: [
          "在支持的股指下一交易时段开盘前预测涨跌。结果根据市场数据结算，虚拟积分计入排行榜。",
        ],
      },
      {
        title: "开放、真诚的讨论",
        paragraphs: [
          "分享判断依据，尊重不同意见。看涨与看跌的观点都受到欢迎。通过自选列表关注感兴趣的市场，也不必每次预测都正确。",
        ],
      },
      {
        title: "社区，而非券商",
        paragraphs: [
          "BullBearVote不执行交易，也不提供个性化投资建议。预测积分没有现金价值。社区观点不等于已核实的事实，市场数据可能存在错误或延迟。",
        ],
      },
    ],
  },
  de: {
    intro:
      "Eine globale Community für ehrliche Marktmeinungen, unterschiedliche Perspektiven und Bull-oder-Bear-Prognosen.",
    sections: [
      {
        title: "Was ist BullBearVote?",
        paragraphs: [
          "Diskutiere weltweite Märkte – von Aktienindizes über Devisen und Futures bis zu Kryptowährungen. Unterschiedliche Meinungen sind ausdrücklich willkommen.",
        ],
      },
      {
        title: "Bull- oder Bear-Prognosen",
        paragraphs: [
          "Sage vor der nächsten Handelssitzung eines unterstützten Aktienindex voraus, ob er steigt oder fällt. Die Ergebnisse werden anhand von Marktdaten ermittelt; virtuelle Punkte zählen für die Rangliste.",
        ],
      },
      {
        title: "Offene und ehrliche Diskussionen",
        paragraphs: [
          "Teile deine Gründe, respektiere Gegenargumente und lerne aus bullischen wie bärischen Sichtweisen. Mit der Watchlist verfolgst du interessante Märkte. Niemand muss immer richtigliegen.",
        ],
      },
      {
        title: "Community statt Broker",
        paragraphs: [
          "BullBearVote führt keine Trades aus und bietet keine persönliche Anlageberatung. Prognosepunkte haben keinen Geldwert. Beiträge sind keine geprüften Fakten; Marktdaten können fehlerhaft oder verzögert sein.",
        ],
      },
    ],
  },
  fr: {
    intro:
      "Une communauté mondiale pour partager des avis sincères sur les marchés, confronter les points de vue et prévoir les hausses ou les baisses.",
    sections: [
      {
        title: "Qu’est-ce que BullBearVote ?",
        paragraphs: [
          "Échangez sur les marchés mondiaux : indices boursiers, devises, contrats à terme et cryptomonnaies. Les points de vue différents ont toute leur place.",
        ],
      },
      {
        title: "Prévisions haussières ou baissières",
        paragraphs: [
          "Avant la prochaine séance d’un indice boursier pris en charge, prévoyez sa hausse ou sa baisse. Les résultats reposent sur les données de marché et les points virtuels alimentent le classement.",
        ],
      },
      {
        title: "Des échanges ouverts et sincères",
        paragraphs: [
          "Expliquez vos analyses, respectez les désaccords et découvrez les arguments haussiers comme baissiers. Suivez vos marchés favoris dans votre liste de suivi. Personne n’a toujours raison.",
        ],
      },
      {
        title: "Une communauté, pas un courtier",
        paragraphs: [
          "BullBearVote n’exécute pas d’ordres et ne fournit pas de conseils personnalisés. Les points de prévision n’ont aucune valeur monétaire. Les avis publiés ne sont pas des faits vérifiés et les données peuvent être erronées ou retardées.",
        ],
      },
    ],
  },
  es: {
    intro:
      "Una comunidad global para compartir opiniones sinceras sobre los mercados, escuchar distintas perspectivas y predecir subidas o bajadas.",
    sections: [
      {
        title: "¿Qué es BullBearVote?",
        paragraphs: [
          "Un espacio para hablar de índices bursátiles, divisas, futuros y criptomonedas de todo el mundo. No hace falta estar de acuerdo para participar.",
        ],
      },
      {
        title: "Predicciones alcistas o bajistas",
        paragraphs: [
          "Antes de la próxima sesión de un índice bursátil compatible, predice si subirá o bajará. Los resultados se determinan con datos de mercado y los puntos virtuales cuentan para la clasificación.",
        ],
      },
      {
        title: "Debates abiertos y sinceros",
        paragraphs: [
          "Explica tus razones, respeta las opiniones contrarias y explora perspectivas alcistas y bajistas. Sigue tus mercados favoritos con la lista de seguimiento. Nadie acierta siempre.",
        ],
      },
      {
        title: "Una comunidad, no un bróker",
        paragraphs: [
          "BullBearVote no ejecuta operaciones ni ofrece asesoramiento personalizado. Los puntos de predicción no tienen valor monetario. Las opiniones no son hechos verificados y los datos pueden contener errores o retrasos.",
        ],
      },
    ],
  },
  pt: {
    intro:
      "Uma comunidade global para compartilhar opiniões honestas sobre os mercados, respeitar diferentes perspectivas e prever altas ou quedas.",
    sections: [
      {
        title: "O que é BullBearVote?",
        paragraphs: [
          "Um espaço para discutir índices de ações, câmbio, futuros e criptomoedas do mundo todo. Não é preciso concordar com todos para participar.",
        ],
      },
      {
        title: "Previsões de alta ou baixa",
        paragraphs: [
          "Antes da próxima sessão de um índice de ações compatível, preveja se ele vai subir ou cair. Os resultados são definidos por dados de mercado e os pontos virtuais entram no ranking.",
        ],
      },
      {
        title: "Discussões abertas e honestas",
        paragraphs: [
          "Compartilhe seus motivos, respeite opiniões diferentes e explore visões de alta e de baixa. Acompanhe seus mercados favoritos na lista de monitoramento. Ninguém precisa acertar sempre.",
        ],
      },
      {
        title: "Comunidade, não corretora",
        paragraphs: [
          "BullBearVote não executa operações nem oferece aconselhamento personalizado. Pontos de previsão não têm valor em dinheiro. Opiniões publicadas não são fatos verificados e os dados podem conter erros ou atrasos.",
        ],
      },
    ],
  },
  it: {
    intro:
      "Una comunità globale per condividere opinioni sincere sui mercati, rispettare prospettive diverse e prevedere rialzi o ribassi.",
    sections: [
      {
        title: "Cos’è BullBearVote?",
        paragraphs: [
          "Uno spazio per discutere di indici azionari, valute, futures e criptovalute di tutto il mondo. Non serve essere tutti d’accordo.",
        ],
      },
      {
        title: "Previsioni Bull o Bear",
        paragraphs: [
          "Prima della prossima seduta di un indice azionario supportato, prevedi un rialzo o un ribasso. I risultati si basano sui dati di mercato e i punti virtuali contribuiscono alla classifica.",
        ],
      },
      {
        title: "Discussioni aperte e sincere",
        paragraphs: [
          "Spiega le tue ragioni, rispetta le opinioni diverse e confronta prospettive rialziste e ribassiste. Segui i mercati preferiti nella watchlist. Nessuno deve avere sempre ragione.",
        ],
      },
      {
        title: "Una community, non un broker",
        paragraphs: [
          "BullBearVote non esegue operazioni né offre consulenza personalizzata. I punti delle previsioni non hanno valore monetario. Le opinioni pubblicate non sono fatti verificati e i dati possono essere errati o in ritardo.",
        ],
      },
    ],
  },
  ru: {
    intro:
      "Мировое сообщество для честного обмена мнениями о рынках, уважения разных взглядов и прогнозов роста или падения.",
    sections: [
      {
        title: "Что такое BullBearVote?",
        paragraphs: [
          "Место для обсуждения фондовых индексов, валют, фьючерсов и криптовалют со всего мира. Участникам необязательно соглашаться друг с другом.",
        ],
      },
      {
        title: "Прогнозы Bull или Bear",
        paragraphs: [
          "До открытия следующей сессии поддерживаемого фондового индекса можно предсказать рост или падение. Результаты определяются по рыночным данным, а виртуальные баллы учитываются в рейтинге.",
        ],
      },
      {
        title: "Открытые и честные обсуждения",
        paragraphs: [
          "Объясняйте свою позицию, уважайте несогласных и сравнивайте бычьи и медвежьи взгляды. Следите за интересными рынками через список наблюдения. Никто не обязан быть прав всегда.",
        ],
      },
      {
        title: "Сообщество, а не брокер",
        paragraphs: [
          "BullBearVote не исполняет сделки и не дает персональных инвестиционных рекомендаций. Баллы прогнозов не имеют денежной стоимости. Мнения участников не являются проверенными фактами, а рыночные данные могут содержать ошибки или задержки.",
        ],
      },
    ],
  },
  ar: {
    intro:
      "مجتمع عالمي لمشاركة الآراء الصادقة حول الأسواق واحترام وجهات النظر المختلفة والتنبؤ بالصعود أو الهبوط.",
    sections: [
      {
        title: "ما هو BullBearVote؟",
        paragraphs: [
          "مساحة لمناقشة مؤشرات الأسهم والعملات والعقود الآجلة والعملات المشفرة حول العالم. لا يشترط أن يتفق الجميع في الرأي.",
        ],
      },
      {
        title: "توقعات الصعود أو الهبوط",
        paragraphs: [
          "يمكنك توقع صعود أو هبوط مؤشر أسهم مدعوم قبل افتتاح جلسته التالية. تُحسم النتائج وفق بيانات السوق وتُحتسب النقاط الافتراضية في لوحة الصدارة.",
        ],
      },
      {
        title: "نقاشات مفتوحة وصادقة",
        paragraphs: [
          "شارك أسباب رأيك واحترم الآراء المخالفة وتعرّف على وجهات النظر الصعودية والهبوطية. تابع الأسواق التي تهمك عبر قائمة المتابعة. ليس مطلوبًا أن تصيب في كل توقع.",
        ],
      },
      {
        title: "مجتمع وليس وسيطًا ماليًا",
        paragraphs: [
          "لا ينفذ BullBearVote صفقات ولا يقدم نصائح استثمارية شخصية. نقاط التوقعات ليس لها قيمة نقدية. آراء المشاركين ليست حقائق تم التحقق منها، وقد تتضمن بيانات السوق أخطاء أو تأخيرًا.",
        ],
      },
    ],
  },
  hi: {
    intro:
      "बाज़ारों पर ईमानदार राय साझा करने, अलग-अलग दृष्टिकोणों का सम्मान करने और तेजी या मंदी का अनुमान लगाने वाला वैश्विक समुदाय।",
    sections: [
      {
        title: "BullBearVote क्या है?",
        paragraphs: [
          "यह दुनिया भर के शेयर सूचकांकों, मुद्राओं, फ्यूचर्स और क्रिप्टोकरेंसी पर चर्चा करने की जगह है। भाग लेने के लिए सबका सहमत होना ज़रूरी नहीं है।",
        ],
      },
      {
        title: "Bull या Bear अनुमान",
        paragraphs: [
          "समर्थित शेयर सूचकांक का अगला कारोबारी सत्र शुरू होने से पहले उसके बढ़ने या गिरने का अनुमान लगाएँ। नतीजे बाज़ार डेटा के आधार पर तय होते हैं और वर्चुअल अंक लीडरबोर्ड में जुड़ते हैं।",
        ],
      },
      {
        title: "खुली और ईमानदार चर्चा",
        paragraphs: [
          "अपनी राय के कारण बताएँ, असहमति का सम्मान करें और तेजी व मंदी दोनों के नज़रिए समझें। वॉचलिस्ट से पसंदीदा बाज़ारों को फ़ॉलो करें। हर बार सही होना ज़रूरी नहीं है।",
        ],
      },
      {
        title: "समुदाय, ब्रोकरेज नहीं",
        paragraphs: [
          "BullBearVote ट्रेड नहीं करता और व्यक्तिगत निवेश सलाह नहीं देता। अनुमान के अंकों का कोई नकद मूल्य नहीं है। समुदाय की राय सत्यापित तथ्य नहीं है और बाज़ार डेटा में गलती या देरी हो सकती है।",
        ],
      },
    ],
  },
};
