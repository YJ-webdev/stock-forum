import type { Language } from "@/lib/data/languages";

export interface AboutPageContent {
  intro: string;
  sections: { title: string; paragraphs: string[] }[];
}

export const ABOUT_PAGE_CONTENT: Record<Language, AboutPageContent> = {
  en: {
    intro:
      "A global community for stock market discussion, market sentiment, and Bull or Bear predictions.",
    sections: [
      {
        title: "What is BullBearVote?",
        paragraphs: [
          "BullBearVote brings discussions about major global stock indices together in one place. Follow markets such as the S&P 500, Nasdaq 100, Nikkei 225, DAX, and FTSE 100.",
        ],
      },
      {
        title: "Bull or Bear predictions",
        paragraphs: [
          "Before a supported index opens for its next trading session, participants can predict whether it will rise or fall. Results are settled using market data, and virtual points contribute to the leaderboard.",
        ],
      },
      {
        title: "Discuss global markets",
        paragraphs: [
          "Share market opinions, reply to other participants, and compare perspectives across regions. Follow markets that interest you using your watchlist.",
        ],
      },
      {
        title: "A community, not a brokerage",
        paragraphs: [
          "BullBearVote does not execute trades or provide personalized investment advice. Predictions use virtual points with no cash value. Community posts and market data may be inaccurate or delayed.",
        ],
      },
    ],
  },
  ko: {
    intro:
      "글로벌 주식시장에 대한 의견을 나누고, 시장 심리를 살펴보며, 상승과 하락을 예측하는 커뮤니티입니다.",
    sections: [
      {
        title: "BullBearVote란?",
        paragraphs: [
          "S&P 500, 나스닥 100, 닛케이 225, DAX, FTSE 100 등 세계 주요 주가지수에 관한 토론을 한곳에서 확인할 수 있습니다.",
        ],
      },
      {
        title: "Bull 또는 Bear 예측",
        paragraphs: [
          "지원되는 지수의 다음 거래 세션이 시작되기 전에 상승 또는 하락을 예측할 수 있습니다. 결과는 시장 데이터를 기준으로 정산되며 가상 포인트가 리더보드에 반영됩니다.",
        ],
      },
      {
        title: "글로벌 시장 토론",
        paragraphs: [
          "시장에 대한 의견을 공유하고 다른 참여자의 글에 답글을 남기며 지역별 전망을 비교할 수 있습니다. 관심 목록으로 원하는 시장을 팔로우하세요.",
        ],
      },
      {
        title: "투자 중개 서비스가 아닌 커뮤니티",
        paragraphs: [
          "BullBearVote는 거래를 실행하거나 개인 맞춤형 투자 자문을 제공하지 않습니다. 예측 포인트는 현금 가치가 없으며 커뮤니티 게시물과 시장 데이터에는 오류나 지연이 있을 수 있습니다.",
        ],
      },
    ],
  },
  ja: {
    intro:
      "世界の株式市場について語り、市場心理を比較し、上昇・下落を予測するコミュニティです。",
    sections: [
      {
        title: "BullBearVoteとは？",
        paragraphs: [
          "S&P 500、Nasdaq 100、日経225、DAX、FTSE 100など、世界の主要株価指数に関する議論を一か所で確認できます。",
        ],
      },
      {
        title: "Bull・Bear予測",
        paragraphs: [
          "対象指数の次の取引開始前に上昇か下落かを予測できます。結果は市場データに基づいて確定され、仮想ポイントがランキングに反映されます。",
        ],
      },
      {
        title: "世界の市場について議論",
        paragraphs: [
          "市場への意見を共有し、他の参加者に返信し、地域ごとの見方を比較できます。ウォッチリストで関心のある市場を追跡できます。",
        ],
      },
      {
        title: "証券会社ではなくコミュニティ",
        paragraphs: [
          "BullBearVoteは取引の執行や個別の投資助言を行いません。ポイントに現金価値はなく、投稿や市場データには誤りや遅延があり得ます。",
        ],
      },
    ],
  },
  zh: {
    intro: "一个讨论全球股市、比较市场情绪并预测涨跌的社区。",
    sections: [
      {
        title: "什么是 BullBearVote？",
        paragraphs: [
          "在这里讨论标普500、纳斯达克100、日经225、DAX和富时100等全球主要股指。",
        ],
      },
      {
        title: "看涨或看跌预测",
        paragraphs: [
          "在支持的指数下一交易时段开盘前，参与者可以预测涨跌。结果根据市场数据结算，虚拟积分计入排行榜。",
        ],
      },
      {
        title: "讨论全球市场",
        paragraphs: [
          "分享市场观点、回复其他用户，并比较不同地区的看法。通过自选列表关注感兴趣的市场。",
        ],
      },
      {
        title: "社区，而非券商",
        paragraphs: [
          "BullBearVote不执行交易，也不提供个性化投资建议。虚拟积分没有现金价值，帖子和市场数据可能存在错误或延迟。",
        ],
      },
    ],
  },
  de: {
    intro:
      "Eine globale Community für Börsendiskussionen, Marktstimmung und Bull-oder-Bear-Prognosen.",
    sections: [
      {
        title: "Was ist BullBearVote?",
        paragraphs: [
          "Diskutiere wichtige Aktienindizes wie S&P 500, Nasdaq 100, Nikkei 225, DAX und FTSE 100 an einem Ort.",
        ],
      },
      {
        title: "Bull- oder Bear-Prognosen",
        paragraphs: [
          "Vor der nächsten Handelssitzung eines unterstützten Index kannst du steigende oder fallende Kurse vorhersagen. Ergebnisse werden anhand von Marktdaten ausgewertet; virtuelle Punkte zählen für die Rangliste.",
        ],
      },
      {
        title: "Globale Märkte diskutieren",
        paragraphs: [
          "Teile Einschätzungen, antworte anderen und vergleiche Perspektiven aus verschiedenen Regionen. Mit der Watchlist verfolgst du deine Märkte.",
        ],
      },
      {
        title: "Community statt Broker",
        paragraphs: [
          "BullBearVote führt keine Trades aus und bietet keine persönliche Anlageberatung. Punkte haben keinen Geldwert; Beiträge und Marktdaten können fehlerhaft oder verzögert sein.",
        ],
      },
    ],
  },
  fr: {
    intro:
      "Une communauté mondiale pour discuter des marchés, comparer le sentiment et prévoir la hausse ou la baisse.",
    sections: [
      {
        title: "Qu’est-ce que BullBearVote ?",
        paragraphs: [
          "Retrouvez les discussions sur les grands indices mondiaux, dont le S&P 500, le Nasdaq 100, le Nikkei 225, le DAX et le FTSE 100.",
        ],
      },
      {
        title: "Prévisions haussières ou baissières",
        paragraphs: [
          "Avant la prochaine séance d’un indice pris en charge, prévoyez une hausse ou une baisse. Les résultats sont établis à partir des données de marché et les points virtuels alimentent le classement.",
        ],
      },
      {
        title: "Discuter des marchés mondiaux",
        paragraphs: [
          "Partagez vos analyses, répondez aux autres et comparez les points de vue régionaux. Suivez vos marchés favoris dans votre liste.",
        ],
      },
      {
        title: "Une communauté, pas un courtier",
        paragraphs: [
          "BullBearVote n’exécute pas d’ordres et ne fournit pas de conseils personnalisés. Les points n’ont aucune valeur monétaire; les publications et données peuvent être erronées ou retardées.",
        ],
      },
    ],
  },
  es: {
    intro:
      "Una comunidad global para debatir sobre bolsa, comparar el sentimiento y predecir subidas o bajadas.",
    sections: [
      {
        title: "¿Qué es BullBearVote?",
        paragraphs: [
          "Reúne conversaciones sobre índices como el S&P 500, Nasdaq 100, Nikkei 225, DAX y FTSE 100.",
        ],
      },
      {
        title: "Predicciones alcistas o bajistas",
        paragraphs: [
          "Antes de la próxima sesión de un índice compatible, puedes predecir si subirá o bajará. Los resultados se calculan con datos de mercado y los puntos virtuales cuentan para la clasificación.",
        ],
      },
      {
        title: "Debate sobre mercados globales",
        paragraphs: [
          "Comparte opiniones, responde a otros participantes y compara perspectivas regionales. Sigue tus mercados favoritos con la lista de seguimiento.",
        ],
      },
      {
        title: "Una comunidad, no un bróker",
        paragraphs: [
          "BullBearVote no ejecuta operaciones ni ofrece asesoramiento personalizado. Los puntos no tienen valor monetario y las publicaciones o datos pueden contener errores o retrasos.",
        ],
      },
    ],
  },
  pt: {
    intro:
      "Uma comunidade global para discutir mercados, comparar o sentimento e prever altas ou quedas.",
    sections: [
      {
        title: "O que é BullBearVote?",
        paragraphs: [
          "Reúne discussões sobre índices como S&P 500, Nasdaq 100, Nikkei 225, DAX e FTSE 100.",
        ],
      },
      {
        title: "Previsões de alta ou baixa",
        paragraphs: [
          "Antes da próxima sessão de um índice compatível, você pode prever alta ou queda. Os resultados usam dados de mercado e os pontos virtuais contam para o ranking.",
        ],
      },
      {
        title: "Discussões sobre mercados globais",
        paragraphs: [
          "Compartilhe opiniões, responda a participantes e compare perspectivas regionais. Acompanhe seus mercados favoritos na lista de monitoramento.",
        ],
      },
      {
        title: "Comunidade, não corretora",
        paragraphs: [
          "BullBearVote não executa operações nem oferece aconselhamento personalizado. Os pontos não têm valor monetário; publicações e dados podem conter erros ou atrasos.",
        ],
      },
    ],
  },
  it: {
    intro:
      "Una comunità globale per discutere i mercati, confrontare il sentiment e prevedere rialzi o ribassi.",
    sections: [
      {
        title: "Cos’è BullBearVote?",
        paragraphs: [
          "Riunisce le discussioni su indici come S&P 500, Nasdaq 100, Nikkei 225, DAX e FTSE 100.",
        ],
      },
      {
        title: "Previsioni Bull o Bear",
        paragraphs: [
          "Prima della prossima seduta di un indice supportato puoi prevedere un rialzo o un ribasso. I risultati si basano sui dati di mercato e i punti virtuali contribuiscono alla classifica.",
        ],
      },
      {
        title: "Discussioni sui mercati globali",
        paragraphs: [
          "Condividi opinioni, rispondi agli altri e confronta prospettive regionali. Segui i mercati preferiti nella watchlist.",
        ],
      },
      {
        title: "Una community, non un broker",
        paragraphs: [
          "BullBearVote non esegue operazioni né offre consulenza personalizzata. I punti non hanno valore monetario e post o dati possono essere errati o in ritardo.",
        ],
      },
    ],
  },
  ru: {
    intro:
      "Мировое сообщество для обсуждения рынков, оценки настроений и прогнозов роста или падения.",
    sections: [
      {
        title: "Что такое BullBearVote?",
        paragraphs: [
          "Здесь обсуждают основные индексы, включая S&P 500, Nasdaq 100, Nikkei 225, DAX и FTSE 100.",
        ],
      },
      {
        title: "Прогнозы Bull или Bear",
        paragraphs: [
          "До начала следующей сессии поддерживаемого индекса можно прогнозировать рост или падение. Итоги рассчитываются по рыночным данным, а виртуальные баллы учитываются в рейтинге.",
        ],
      },
      {
        title: "Обсуждение мировых рынков",
        paragraphs: [
          "Делитесь мнениями, отвечайте другим участникам и сравнивайте взгляды из разных регионов. Следите за рынками через список наблюдения.",
        ],
      },
      {
        title: "Сообщество, а не брокер",
        paragraphs: [
          "BullBearVote не исполняет сделки и не предоставляет персональных инвестиционных рекомендаций. Баллы не имеют денежной стоимости; публикации и данные могут быть неточными или запаздывать.",
        ],
      },
    ],
  },
  ar: {
    intro:
      "مجتمع عالمي لمناقشة أسواق الأسهم ومقارنة معنويات السوق والتنبؤ بالصعود أو الهبوط.",
    sections: [
      {
        title: "ما هو BullBearVote؟",
        paragraphs: [
          "يجمع مناقشات المؤشرات العالمية مثل S&P 500 وNasdaq 100 وNikkei 225 وDAX وFTSE 100 في مكان واحد.",
        ],
      },
      {
        title: "توقعات الصعود أو الهبوط",
        paragraphs: [
          "يمكنك توقع اتجاه المؤشرات المدعومة قبل بدء جلسة التداول التالية. تُحسم النتائج وفق بيانات السوق وتُحتسب النقاط الافتراضية في لوحة الصدارة.",
        ],
      },
      {
        title: "ناقش الأسواق العالمية",
        paragraphs: [
          "شارك آراءك ورد على المشاركين وقارن وجهات النظر من مناطق مختلفة. تابع الأسواق التي تهمك عبر قائمة المتابعة.",
        ],
      },
      {
        title: "مجتمع وليس وسيطًا ماليًا",
        paragraphs: [
          "لا ينفذ BullBearVote صفقات ولا يقدم نصائح استثمارية شخصية. النقاط بلا قيمة نقدية وقد تتأخر بيانات السوق أو تحتوي المشاركات على أخطاء.",
        ],
      },
    ],
  },
  hi: {
    intro:
      "वैश्विक शेयर बाज़ारों पर चर्चा, बाज़ार रुझान की तुलना और तेजी या मंदी का अनुमान लगाने का समुदाय।",
    sections: [
      {
        title: "BullBearVote क्या है?",
        paragraphs: [
          "यह S&P 500, Nasdaq 100, Nikkei 225, DAX और FTSE 100 जैसे प्रमुख वैश्विक सूचकांकों पर चर्चाओं को एक जगह लाता है।",
        ],
      },
      {
        title: "Bull या Bear अनुमान",
        paragraphs: [
          "समर्थित सूचकांक का अगला कारोबारी सत्र शुरू होने से पहले आप बढ़त या गिरावट का अनुमान लगा सकते हैं। परिणाम बाज़ार डेटा से तय होते हैं और आभासी अंक लीडरबोर्ड में जुड़ते हैं।",
        ],
      },
      {
        title: "वैश्विक बाज़ारों पर चर्चा",
        paragraphs: [
          "अपनी राय साझा करें, दूसरों को जवाब दें और अलग-अलग क्षेत्रों के विचारों की तुलना करें। वॉचलिस्ट से पसंदीदा बाज़ारों को फ़ॉलो करें।",
        ],
      },
      {
        title: "समुदाय, ब्रोकरेज नहीं",
        paragraphs: [
          "BullBearVote ट्रेड नहीं करता और व्यक्तिगत निवेश सलाह नहीं देता। अंकों का नकद मूल्य नहीं है; पोस्ट और बाज़ार डेटा में गलती या देरी हो सकती है।",
        ],
      },
    ],
  },
};
