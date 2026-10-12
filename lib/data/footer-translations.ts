import type { Language } from "@/lib/data/languages";

export type FeedbackCategory = "suggestion" | "bug" | "other";

export interface FooterPolicySection {
  title: string;
  content: string[];
}

export interface FooterPageContent {
  help_intro: string;
  share_feedback: string;
  feedback_intro: string;
  feedback_question: string;
  categories: Record<FeedbackCategory, string>;
  your_feedback: string;
  bug_placeholder: string;
  feedback_placeholder: string;
  unavailable: string;
  send: string;
  privacy_intro: string;
  disclaimer_intro: string;
  help_items: { title: string; content: string }[];
  privacy_terms: FooterPolicySection[];
  disclaimer: FooterPolicySection[];
}

export const FOOTER_PAGE_CONTENT: Record<Language, FooterPageContent> = {
  en: {
    help_intro:
      "Find answers about predictions, your watchlist, and account settings.",
    share_feedback: "Share feedback",
    feedback_intro:
      "Have an idea or found something that isn’t working? Tell us about it.",
    feedback_question: "What would you like to share?",
    categories: {
      suggestion: "Suggestion",
      bug: "Bug report",
      other: "Other",
    },
    your_feedback: "Your feedback",
    bug_placeholder: "What happened, and what did you expect to happen?",
    feedback_placeholder: "What would you like us to improve?",
    unavailable: "Feedback submission is not available yet.",
    send: "Send feedback",
    privacy_intro:
      "Learn how BullBearVote handles your information and the rules that apply when you use the community.",
    disclaimer_intro:
      "Please read these limitations before using market information, predictions, or community content on BullBearVote.",
    help_items: [
      {
        title: "How do predictions work?",
        content:
          "Choose Bull or Bear to predict an index’s next market session. Predictions are available before the market opens.",
      },
      {
        title: "Why is voting closed?",
        content:
          "Voting closes while the market is open. Check the market’s countdown for the next voting window.",
      },
      {
        title: "Which markets support predictions?",
        content:
          "Predictions are available for indices. You can discuss crypto, currencies, and commodities through comments.",
      },
      {
        title: "How do I manage my watchlist?",
        content:
          "Open Manage watchlist to add or remove markets. You can follow up to 20 markets.",
      },
      {
        title: "Can I change my language?",
        content:
          "Open account settings and select a language. Your selection is saved automatically.",
      },
    ],
    privacy_terms: [
      {
        title: "Information we collect",
        content: [
          "When you sign in with Google or GitHub, we receive account information such as your email address, username, profile image, and provider account identifier.",
          "We store the nationality, language, and watchlist preferences you choose, along with your activity on BullBearVote, including comments, replies, predictions, points history, likes, and reports.",
          "We use cookies to maintain your login session and may use local storage to remember interface preferences, such as your theme. Temporary cached data helps pages and market information load faster.",
        ],
      },
      {
        title: "How information is used",
        content: [
          "We use your information to manage your account, remember your preferences, provide community features, process predictions and points, and help prevent abuse.",
          "Your username, profile image, and public contributions may be visible to other users. Your nationality may appear alongside your contributions or in country-based statistics. Your email address and authentication details are not displayed publicly.",
          "Service providers supporting authentication, hosting, and data storage may process information as needed to operate the site. Information may also be disclosed where required by applicable law.",
        ],
      },
      {
        title: "Data storage and retention",
        content: [
          "Your information is stored using the services that support BullBearVote. These providers may process information in countries other than your country of residence.",
          "We retain information for as long as needed to provide your account and site features, maintain prediction records, address abuse or disputes, and meet applicable legal obligations. The retention period depends on the type of information and the purpose for which it is used.",
          "Temporary cached data may expire sooner than account records. Deleted information may remain in backups until those backups are replaced or expire.",
        ],
      },
      {
        title: "Account deletion",
        content: [
          "You can request account deletion using the contact details below. We may ask you to verify account ownership before processing your request.",
          "When handling your request, we will explain how deletion affects your profile, comments, replies, predictions, and points history, including any information that must be retained and the reasons for retaining it.",
          "Signing out, clearing your browser cookies, or disconnecting Google or GitHub does not by itself delete your BullBearVote account.",
        ],
      },
      {
        title: "Community rules",
        content: [
          "Keep discussions respectful and relevant to the market or topic. Disagreement is welcome, but harassment, threats, hate speech, and targeted abuse are not.",
          "Do not post spam, unsolicited advertising, scams, explicit sexual content, or another person's private information. Do not impersonate others or share content you do not have permission to use.",
          "Do not manipulate predictions, points, likes, or rankings through multiple accounts, automation, or exploitation of site errors.",
          "Content that violates these rules may be restricted or removed. Repeated or serious violations may result in account restrictions or suspension. You can report inappropriate content for review.",
        ],
      },
      {
        title: "Terms of use",
        content: [
          "BullBearVote provides market discussion and a virtual prediction game. It does not provide brokerage services or execute trades. You are responsible for your account activity and the content you submit.",
          "You retain ownership of your content. By submitting it, you grant BullBearVote permission to store, display, and process it as needed to operate and moderate the service.",
          "Predictions, community posts, rankings, and market information are not financial advice. Points have no monetary value and cannot be redeemed for cash.",
          "Market data and prediction results may contain errors. Results and points may be corrected when data or processing errors are identified.",
          "Features and prediction rules may change, and uninterrupted service is not guaranteed. These terms may be updated as the service changes. Nothing in these terms limits rights that cannot be excluded under applicable law.",
        ],
      },
      {
        title: "Contact",
        content: [
          "For privacy questions, account deletion requests, requests to access or correct your personal information, or concerns about moderation, contact us at {email}.",
          "Include your username and enough detail for us to understand your request. Never send your password, login codes, or authentication tokens.",
        ],
      },
    ],
    disclaimer: [
      {
        title: "Purpose of this website",
        content: [
          "BullBearVote is a community platform for discussing global markets and making virtual predictions about index performance.",
          "All information is provided for general information, discussion, and entertainment. Nothing on this website should be treated as investment advice or a recommendation to buy, sell, or hold any financial asset.",
          "You are responsible for your financial decisions. Consider your circumstances and seek qualified professional advice when needed.",
        ],
      },
      {
        title: "Market data and availability",
        content: [
          "Market prices, charts, trading hours, news, and other information are obtained from third-party sources and may be delayed, incomplete, or inaccurate.",
          "Holidays, changes to trading schedules, provider limitations, and technical issues may affect displayed market status and data availability. Charts may show the latest available session rather than the current day.",
          "We do not guarantee the accuracy, completeness, or timeliness of market information. Verify information independently before using it to make financial decisions.",
        ],
      },
      {
        title: "Predictions and points",
        content: [
          "Predictions are part of a virtual game and are available for supported indices before the relevant market session opens. Voting closes while the market is open.",
          "Points are virtual scores used within BullBearVote. They have no monetary value and cannot be withdrawn, exchanged for money, or redeemed for financial assets.",
          "Prediction outcomes depend on the site's settlement rules and available market data. Missing or corrected data, market closures, or technical errors may delay settlement or require results and points to be adjusted.",
          "Past prediction results and leaderboard positions do not establish investment expertise or guarantee future performance.",
        ],
      },
      {
        title: "Community content",
        content: [
          "Comments, replies, and predictions express the views of individual users and do not necessarily reflect the views of BullBearVote.",
          "Community content may be inaccurate, misleading, or speculative. A post's popularity, likes, or author ranking should not be treated as evidence that its claims are reliable.",
          "Moderation helps address inappropriate content but does not verify every claim or guarantee that all harmful content will be identified immediately. Report content that may violate the community rules.",
        ],
      },
      {
        title: "External links",
        content: [
          "BullBearVote may include links to news articles and other third-party websites. These links are provided for convenience and reference and do not imply endorsement.",
          "We do not control the content, availability, security, or privacy practices of external websites. Their own terms and privacy policies apply when you visit them.",
        ],
      },
    ],
  },
  ko: {
    help_intro: "예측, 관심 마켓, 계정 설정에 대한 답변을 찾아보세요.",
    share_feedback: "의견 보내기",
    feedback_intro:
      "아이디어가 있거나 잘 작동하지 않는 부분을 발견했나요? 알려주세요.",
    feedback_question: "어떤 이야기를 나누고 싶나요?",
    your_feedback: "보내실 의견",
    bug_placeholder: "어떤 일이 있었고, 어떻게 작동할 것으로 예상했나요?",
    feedback_placeholder: "어떤 점을 개선하면 좋을까요?",
    unavailable: "의견 보내기 기능은 아직 준비 중입니다.",
    send: "의견 보내기",
    privacy_intro:
      "BullBearVote가 정보를 처리하는 방식과 커뮤니티 이용 규칙을 확인하세요.",
    disclaimer_intro:
      "BullBearVote의 시장 정보, 예측, 커뮤니티 콘텐츠를 이용하기 전에 아래 제한 사항을 읽어주세요.",
    categories: {
      suggestion: "제안",
      bug: "오류 신고",
      other: "기타",
    },
    help_items: [
      {
        title: "예측은 어떻게 하나요?",
        content:
          "Bull 또는 Bear를 선택해 지수의 다음 거래 세션 방향을 예측하세요. 시장이 열리기 전에 예측할 수 있습니다.",
      },
      {
        title: "왜 투표가 닫혀 있나요?",
        content:
          "시장이 열려 있는 동안에는 투표가 닫힙니다. 다음 투표 가능 시간은 해당 마켓의 카운트다운을 확인하세요.",
      },
      {
        title: "어떤 마켓에서 예측할 수 있나요?",
        content:
          "지수에서 예측할 수 있습니다. 암호화폐, 통화, 원자재는 댓글로 의견을 나눌 수 있습니다.",
      },
      {
        title: "관심 마켓은 어떻게 관리하나요?",
        content:
          "관심 마켓 관리를 열어 마켓을 추가하거나 삭제하세요. 최대 20개까지 등록할 수 있습니다.",
      },
      {
        title: "언어를 변경할 수 있나요?",
        content:
          "계정 설정에서 언어를 선택하세요. 선택한 언어는 자동으로 저장됩니다.",
      },
    ],
    privacy_terms: [
      {
        title: "수집하는 정보",
        content: [
          "Google 또는 GitHub로 로그인하면 이메일 주소, 사용자 이름, 프로필 이미지, 제공업체의 계정 식별자 등의 계정 정보를 받습니다.",
          "선택한 국적, 언어, 관심 마켓과 댓글, 답글, 예측, 포인트 내역, 좋아요, 신고 등 BullBearVote 활동을 저장합니다.",
          "로그인 세션 유지에 쿠키를 사용하며 테마 등 화면 설정을 기억하기 위해 로컬 스토리지를 사용할 수 있습니다. 임시 캐시 데이터는 페이지와 시장 정보를 빠르게 불러오는 데 사용됩니다.",
        ],
      },
      {
        title: "정보의 이용",
        content: [
          "계정 관리, 설정 저장, 커뮤니티 기능 제공, 예측과 포인트 처리, 악용 방지를 위해 정보를 이용합니다.",
          "사용자 이름, 프로필 이미지, 공개 기여 내용은 다른 사용자에게 보일 수 있습니다. 국적은 게시물이나 국가별 통계에 표시될 수 있습니다. 이메일 주소와 인증 정보는 공개하지 않습니다.",
          "인증, 호스팅, 데이터 저장을 지원하는 서비스 제공업체는 사이트 운영에 필요한 정보를 처리할 수 있습니다. 관련 법률에 따라 필요한 경우 정보가 공개될 수 있습니다.",
        ],
      },
      {
        title: "정보 저장 및 보관",
        content: [
          "정보는 BullBearVote를 지원하는 서비스에 저장됩니다. 제공업체는 거주 국가 외의 국가에서 정보를 처리할 수 있습니다.",
          "계정과 사이트 기능 제공, 예측 기록 유지, 악용 또는 분쟁 대응, 관련 법적 의무 이행에 필요한 기간 동안 정보를 보관합니다. 보관 기간은 정보 종류와 이용 목적에 따라 다릅니다.",
          "임시 캐시는 계정 기록보다 먼저 만료될 수 있습니다. 삭제된 정보는 백업이 교체되거나 만료될 때까지 백업에 남을 수 있습니다.",
        ],
      },
      {
        title: "계정 삭제",
        content: [
          "아래 연락처로 계정 삭제를 요청할 수 있습니다. 요청을 처리하기 전에 계정 소유권 확인을 요구할 수 있습니다.",
          "삭제 요청 처리 시 프로필, 댓글, 답글, 예측, 포인트 내역에 미치는 영향과 보관이 필요한 정보 및 그 이유를 설명합니다.",
          "로그아웃, 브라우저 쿠키 삭제, Google 또는 GitHub 연결 해제만으로 BullBearVote 계정이 삭제되지는 않습니다.",
        ],
      },
      {
        title: "커뮤니티 규칙",
        content: [
          "서로 존중하며 시장이나 주제와 관련된 내용을 나눠주세요. 다른 의견은 환영하지만 괴롭힘, 위협, 혐오 표현, 특정인을 겨냥한 공격은 허용하지 않습니다.",
          "스팸, 요청받지 않은 광고, 사기, 노골적인 성적 콘텐츠, 타인의 개인정보를 게시하지 마세요. 타인을 사칭하거나 사용 권한이 없는 콘텐츠를 공유하지 마세요.",
          "다중 계정, 자동화, 사이트 오류 악용으로 예측, 포인트, 좋아요, 순위를 조작하지 마세요.",
          "규칙을 위반한 콘텐츠는 제한되거나 삭제될 수 있습니다. 반복되거나 심각한 위반은 계정 제한이나 이용 정지로 이어질 수 있습니다. 부적절한 콘텐츠는 신고할 수 있습니다.",
        ],
      },
      {
        title: "이용약관",
        content: [
          "BullBearVote는 시장 토론과 가상 예측 게임을 제공합니다. 중개 서비스를 제공하거나 거래를 실행하지 않습니다. 계정 활동과 제출한 콘텐츠에 대한 책임은 사용자에게 있습니다.",
          "콘텐츠의 소유권은 사용자에게 있습니다. 콘텐츠를 제출하면 서비스 운영과 관리에 필요한 저장, 표시, 처리 권한을 BullBearVote에 부여합니다.",
          "예측, 커뮤니티 게시물, 순위, 시장 정보는 금융 자문이 아닙니다. 포인트는 금전적 가치가 없으며 현금으로 교환할 수 없습니다.",
          "시장 데이터와 예측 결과에는 오류가 있을 수 있습니다. 데이터나 처리 오류가 확인되면 결과와 포인트가 수정될 수 있습니다.",
          "기능과 예측 규칙은 변경될 수 있으며 중단 없는 서비스를 보장하지 않습니다. 서비스 변경에 따라 약관이 갱신될 수 있습니다. 관련 법률에 따라 배제할 수 없는 권리를 이 약관으로 제한하지 않습니다.",
        ],
      },
      {
        title: "문의",
        content: [
          "개인정보 문의, 계정 삭제, 개인정보 열람·정정 요청, 관리 조치에 관한 문의는 {email}로 보내주세요.",
          "사용자 이름과 요청을 이해할 수 있는 충분한 내용을 포함해 주세요. 비밀번호, 로그인 코드, 인증 토큰은 절대 보내지 마세요.",
        ],
      },
    ],
    disclaimer: [
      {
        title: "사이트의 목적",
        content: [
          "BullBearVote는 세계 시장에 대해 토론하고 지수 움직임을 가상으로 예측하는 커뮤니티입니다.",
          "모든 정보는 일반적인 정보 제공, 토론, 오락을 위한 것입니다. 사이트의 내용을 투자 자문이나 금융 자산의 매수·매도·보유 권유로 받아들이지 마세요.",
          "금융 의사결정의 책임은 사용자에게 있습니다. 자신의 상황을 고려하고 필요하면 자격을 갖춘 전문가의 조언을 구하세요.",
        ],
      },
      {
        title: "시장 데이터 및 이용 가능 여부",
        content: [
          "가격, 차트, 거래 시간, 뉴스 등의 정보는 제삼자 출처에서 제공되며 지연되거나 불완전하거나 부정확할 수 있습니다.",
          "휴장일, 거래 일정 변경, 제공업체의 제한, 기술적 문제는 표시되는 시장 상태와 데이터 제공에 영향을 줄 수 있습니다. 차트는 오늘이 아닌 가장 최근 이용 가능한 거래 세션을 보여줄 수 있습니다.",
          "시장 정보의 정확성, 완전성, 적시성을 보장하지 않습니다. 금융 의사결정에 사용하기 전에 별도로 확인하세요.",
        ],
      },
      {
        title: "예측과 포인트",
        content: [
          "예측은 가상 게임의 일부이며 지원되는 지수의 해당 거래 세션이 열리기 전에 참여할 수 있습니다. 시장이 열려 있는 동안에는 투표가 닫힙니다.",
          "포인트는 BullBearVote 안에서 사용하는 가상 점수입니다. 금전적 가치가 없으며 출금하거나 돈 또는 금융 자산으로 교환할 수 없습니다.",
          "예측 결과는 사이트의 정산 규칙과 이용 가능한 시장 데이터에 따라 결정됩니다. 누락·정정된 데이터, 시장 폐장, 기술 오류로 정산이 지연되거나 결과와 포인트가 조정될 수 있습니다.",
          "과거 예측 결과나 리더보드 순위는 투자 전문성을 입증하거나 미래 성과를 보장하지 않습니다.",
        ],
      },
      {
        title: "커뮤니티 콘텐츠",
        content: [
          "댓글, 답글, 예측은 개별 사용자의 의견이며 BullBearVote의 견해와 일치하지 않을 수 있습니다.",
          "커뮤니티 콘텐츠는 부정확하거나 오해를 유발하거나 추측에 기반할 수 있습니다. 인기도, 좋아요 수, 작성자 순위를 주장의 신뢰성을 입증하는 근거로 삼지 마세요.",
          "콘텐츠 관리는 부적절한 내용을 처리하는 데 도움을 주지만 모든 주장을 검증하거나 유해한 내용을 즉시 모두 찾아내는 것을 보장하지 않습니다. 커뮤니티 규칙 위반이 의심되는 콘텐츠는 신고해 주세요.",
        ],
      },
      {
        title: "외부 링크",
        content: [
          "BullBearVote에는 뉴스 기사나 제삼자 사이트 링크가 포함될 수 있습니다. 편의와 참고를 위해 제공하며 해당 사이트를 지지한다는 의미는 아닙니다.",
          "외부 사이트의 콘텐츠, 가용성, 보안, 개인정보 처리 방식은 통제하지 않습니다. 방문 시 해당 사이트의 약관과 개인정보 처리방침이 적용됩니다.",
        ],
      },
    ],
  },
  ja: {
    help_intro:
      "予測、ウォッチリスト、アカウント設定についての回答を探せます。",
    share_feedback: "フィードバックを送る",
    feedback_intro:
      "アイデアや、うまく動かないところがありますか？ぜひ教えてください。",
    feedback_question: "どんなことを伝えたいですか？",
    your_feedback: "フィードバック",
    bug_placeholder: "何が起きましたか？どのような動作を期待していましたか？",
    feedback_placeholder: "どんなところを改善してほしいですか？",
    unavailable: "フィードバックの送信機能はまだ利用できません。",
    send: "フィードバックを送信",
    privacy_intro:
      "BullBearVoteでの情報の取り扱いと、コミュニティの利用ルールをご確認ください。",
    disclaimer_intro:
      "BullBearVoteの市場情報、予測、コミュニティの投稿を利用する前に、以下の制限事項をお読みください。",
    categories: {
      suggestion: "提案",
      bug: "不具合の報告",
      other: "その他",
    },
    help_items: [
      {
        title: "予測の仕組みは？",
        content:
          "BullまたはBearを選び、指数の次の取引セッションの方向を予測します。市場が開く前に参加できます。",
      },
      {
        title: "なぜ投票できないのですか？",
        content:
          "市場が開いている間は投票できません。次の投票時間は市場のカウントダウンをご確認ください。",
      },
      {
        title: "どの市場で予測できますか？",
        content:
          "指数で予測できます。暗号資産、通貨、商品についてはコメントで話し合えます。",
      },
      {
        title: "ウォッチリストの管理方法は？",
        content:
          "ウォッチリストの管理を開き、市場を追加・削除できます。最大20市場を登録できます。",
      },
      {
        title: "言語を変更できますか？",
        content:
          "アカウント設定で言語を選んでください。選択は自動で保存されます。",
      },
    ],
    privacy_terms: [
      {
        title: "収集する情報",
        content: [
          "GoogleまたはGitHubでログインすると、メールアドレス、ユーザー名、プロフィール画像、認証提供元のアカウント識別子などを受け取ります。",
          "選択した国籍、言語、ウォッチリストと、コメント、返信、予測、ポイント履歴、いいね、通報などの活動を保存します。",
          "ログイン状態の維持にCookieを使い、テーマなどの表示設定を記憶するためにローカルストレージを使う場合があります。一時キャッシュはページや市場情報の読み込みを速めます。",
        ],
      },
      {
        title: "情報の利用目的",
        content: [
          "アカウント管理、設定の保存、コミュニティ機能、予測とポイントの処理、不正利用の防止に情報を利用します。",
          "ユーザー名、画像、公開投稿は他のユーザーに表示される場合があります。国籍は投稿や国別統計に表示される場合があります。メールアドレスと認証情報は公開しません。",
          "認証、ホスティング、保存を支援する事業者は運営に必要な情報を処理する場合があります。適用法令により必要な場合、情報を開示することがあります。",
        ],
      },
      {
        title: "情報の保存と保持期間",
        content: [
          "情報はBullBearVoteを支えるサービスに保存され、事業者が居住国以外で処理する場合があります。",
          "アカウントと機能の提供、予測記録の維持、不正や紛争への対応、法的義務の履行に必要な期間保持します。期間は情報の種類と目的によって異なります。",
          "一時キャッシュはアカウント記録より早く期限切れになる場合があります。削除情報はバックアップが更新または期限切れになるまで残る場合があります。",
        ],
      },
      {
        title: "アカウント削除",
        content: [
          "下記の連絡先から削除を申請できます。処理前にアカウント所有者の確認をお願いする場合があります。",
          "削除によるプロフィール、コメント、返信、予測、ポイント履歴への影響と、保持が必要な情報および理由をご説明します。",
          "ログアウト、Cookieの削除、GoogleやGitHubとの連携解除だけではBullBearVoteアカウントは削除されません。",
        ],
      },
      {
        title: "コミュニティルール",
        content: [
          "市場や話題に関連する内容を、互いを尊重して投稿してください。異論は歓迎しますが、嫌がらせ、脅迫、差別的発言、特定の人への攻撃は禁止です。",
          "スパム、望まれない広告、詐欺、露骨な性的内容、他人の個人情報を投稿しないでください。なりすましや、使用許可のない内容の共有は禁止です。",
          "複数アカウント、自動化、サイトの不具合を利用して予測、ポイント、いいね、順位を操作しないでください。",
          "違反内容は制限または削除される場合があります。繰り返しや重大な違反はアカウントの制限・停止につながる場合があります。不適切な内容は通報できます。",
        ],
      },
      {
        title: "利用規約",
        content: [
          "BullBearVoteは市場の議論と仮想予測ゲームを提供し、仲介業務や取引の執行は行いません。アカウントの活動と投稿内容は利用者の責任です。",
          "投稿内容の所有権は利用者にあります。投稿すると、運営と管理に必要な保存、表示、処理の許可をBullBearVoteに与えます。",
          "予測、投稿、順位、市場情報は金融助言ではありません。ポイントに金銭的価値はなく、現金と交換できません。",
          "市場データや予測結果には誤りがある場合があります。データや処理の誤りが判明した際は、結果とポイントを修正する場合があります。",
          "機能や予測ルールは変更される場合があり、無停止の提供は保証しません。サービス変更に伴い規約を更新する場合があります。適用法令上排除できない権利は本規約で制限しません。",
        ],
      },
      {
        title: "お問い合わせ",
        content: [
          "プライバシー、アカウント削除、個人情報の閲覧・訂正、管理措置については{email}へご連絡ください。",
          "ユーザー名と、依頼を理解できる詳細を添えてください。パスワード、ログインコード、認証トークンは送らないでください。",
        ],
      },
    ],
    disclaimer: [
      {
        title: "サイトの目的",
        content: [
          "BullBearVoteは世界の市場を議論し、指数の動きを仮想的に予測するコミュニティです。",
          "情報は一般的な情報提供、議論、娯楽のためです。投資助言や金融資産の購入・売却・保有の推奨として扱わないでください。",
          "金融上の判断は利用者の責任です。自身の状況を考慮し、必要に応じて資格を持つ専門家に相談してください。",
        ],
      },
      {
        title: "市場データと利用可能性",
        content: [
          "価格、チャート、取引時間、ニュースなどは第三者から取得し、遅延、不足、誤りがある場合があります。",
          "休場日、取引日程の変更、提供元の制限、技術的問題で市場状態の表示やデータ提供が影響を受ける場合があります。チャートは当日ではなく最新の利用可能なセッションを示す場合があります。",
          "情報の正確性、完全性、適時性は保証しません。金融判断に使う前に独自に確認してください。",
        ],
      },
      {
        title: "予測とポイント",
        content: [
          "予測は仮想ゲームの一部で、対応する指数の対象取引セッションが開く前に参加できます。市場が開いている間は投票できません。",
          "ポイントはサイト内の仮想スコアで、金銭的価値はなく、出金や金銭・金融資産との交換はできません。",
          "結果はサイトの精算ルールと利用可能な市場データによります。データの欠落・訂正、休場、技術的問題で精算が遅れ、結果やポイントを調整する場合があります。",
          "過去の予測結果や順位は投資の専門性を示すものではなく、将来の成績を保証しません。",
        ],
      },
      {
        title: "コミュニティの投稿",
        content: [
          "コメント、返信、予測は個々の利用者の見解であり、BullBearVoteの見解とは限りません。",
          "投稿には誤り、誤解を招く内容、推測が含まれる場合があります。人気、いいね、投稿者の順位を信頼性の証拠として扱わないでください。",
          "管理は不適切な内容への対応を支えますが、すべての主張の検証や有害内容の即時発見を保証しません。ルール違反の疑いがある投稿は通報してください。",
        ],
      },
      {
        title: "外部リンク",
        content: [
          "ニュース記事などの第三者サイトへのリンクは便宜と参照のために提供し、支持や推奨を意味しません。",
          "外部サイトの内容、利用可能性、安全性、プライバシーの取り扱いは管理していません。訪問先の規約とプライバシーポリシーが適用されます。",
        ],
      },
    ],
  },
  zh: {
    help_intro: "查找有关预测、自选市场和账户设置的常见问题。",
    share_feedback: "分享反馈",
    feedback_intro: "有新想法，或发现了无法正常使用的功能？告诉我们吧。",
    feedback_question: "你想分享什么？",
    your_feedback: "你的反馈",
    bug_placeholder: "发生了什么？你原本希望它如何运行？",
    feedback_placeholder: "你希望我们改进什么？",
    unavailable: "反馈提交功能暂未开放。",
    send: "发送反馈",
    privacy_intro:
      "了解BullBearVote如何处理你的信息，以及使用社区时须遵守的规则。",
    disclaimer_intro:
      "在使用BullBearVote的市场信息、预测或社区内容前，请阅读以下限制说明。",
    categories: {
      suggestion: "建议",
      bug: "问题报告",
      other: "其他",
    },
    help_items: [
      {
        title: "预测如何进行？",
        content:
          "选择Bull或Bear，预测指数下一交易时段的方向。市场开盘前可以参与预测。",
      },
      {
        title: "为什么投票已关闭？",
        content:
          "市场开盘期间投票关闭。请查看该市场的倒计时，了解下一次投票时间。",
      },
      {
        title: "哪些市场支持预测？",
        content: "指数支持预测。你可以通过评论讨论加密货币、货币和大宗商品。",
      },
      {
        title: "如何管理自选市场？",
        content: "打开自选市场管理，添加或移除市场。最多可添加20个市场。",
      },
      {
        title: "可以更改语言吗？",
        content: "在账户设置中选择语言，选择会自动保存。",
      },
    ],
    privacy_terms: [
      {
        title: "我们收集的信息",
        content: [
          "通过Google或GitHub登录时，我们会收到电子邮箱、用户名、头像和提供商账户标识等信息。",
          "我们保存你选择的国籍、语言和自选市场，以及评论、回复、预测、积分记录、点赞和举报等活动。",
          "我们使用Cookie维持登录会话，并可能使用本地存储记住主题等界面偏好。临时缓存有助于加快页面和市场信息的加载。",
        ],
      },
      {
        title: "信息的用途",
        content: [
          "信息用于管理账户、保存偏好、提供社区功能、处理预测和积分，以及防止滥用。",
          "用户名、头像和公开贡献可能对其他用户可见。国籍可能显示在投稿旁或国家统计中。电子邮箱和认证信息不会公开显示。",
          "支持认证、托管和数据存储的服务商可能处理运营网站所需的信息。适用法律要求时，我们也可能披露信息。",
        ],
      },
      {
        title: "数据存储与保留",
        content: [
          "信息存储在支持BullBearVote的服务中，服务商可能在你的居住国以外处理信息。",
          "我们在提供账户和功能、保存预测记录、处理滥用或争议及履行法律义务所需的期间内保留信息。期限取决于信息类型和用途。",
          "临时缓存可能早于账户记录失效。已删除信息可能保留在备份中，直到备份被替换或到期。",
        ],
      },
      {
        title: "删除账户",
        content: [
          "你可通过下方联系方式申请删除账户。处理前，我们可能要求验证账户所有权。",
          "处理申请时，我们会说明删除对头像资料、评论、回复、预测和积分记录的影响，以及必须保留的信息及原因。",
          "退出登录、清除Cookie或断开Google或GitHub连接，本身并不会删除BullBearVote账户。",
        ],
      },
      {
        title: "社区规则",
        content: [
          "讨论应保持尊重，并与市场或主题相关。欢迎不同意见，但不允许骚扰、威胁、仇恨言论或针对个人的攻击。",
          "请勿发布垃圾信息、未经请求的广告、诈骗、露骨色情内容或他人隐私。请勿冒充他人或分享无权使用的内容。",
          "请勿通过多账户、自动化或利用网站错误操纵预测、积分、点赞或排名。",
          "违规内容可能被限制或删除。重复或严重违规可能导致账户受限或停用。你可以举报不当内容以供审核。",
        ],
      },
      {
        title: "使用条款",
        content: [
          "BullBearVote提供市场讨论和虚拟预测游戏，不提供经纪服务，也不执行交易。你须对账户活动和提交的内容负责。",
          "你保留内容的所有权。提交内容即授权BullBearVote为运营和管理服务所需而存储、展示和处理内容。",
          "预测、社区帖子、排名和市场信息不构成财务建议。积分没有货币价值，不能兑换现金。",
          "市场数据和预测结果可能有误。发现数据或处理错误时，结果和积分可能被更正。",
          "功能和预测规则可能变化，服务不中断无法保证。条款可能随服务变化而更新。本条款不限制适用法律规定不得排除的权利。",
        ],
      },
      {
        title: "联系我们",
        content: [
          "隐私问题、账户删除、个人信息访问或更正申请，以及内容管理方面的问题，请联系{email}。",
          "请提供用户名和足以说明申请的详情。不要发送密码、登录验证码或认证令牌。",
        ],
      },
    ],
    disclaimer: [
      {
        title: "网站用途",
        content: [
          "BullBearVote是讨论全球市场并对指数表现进行虚拟预测的社区平台。",
          "所有信息仅供一般信息、讨论和娱乐用途。不要将网站内容视为投资建议，或购买、出售、持有金融资产的推荐。",
          "你须对自己的财务决策负责。请考虑个人情况，必要时寻求具备资质的专业意见。",
        ],
      },
      {
        title: "市场数据与可用性",
        content: [
          "价格、图表、交易时间、新闻等信息来自第三方，可能延迟、不完整或不准确。",
          "节假日、交易日程变化、提供商限制和技术问题可能影响市场状态显示和数据可用性。图表可能显示最近可用的交易时段，而非当天。",
          "我们不保证市场信息的准确性、完整性或及时性。用于财务决策前，请独立核实。",
        ],
      },
      {
        title: "预测与积分",
        content: [
          "预测属于虚拟游戏，可在支持的指数相关交易时段开盘前参与。开盘期间投票关闭。",
          "积分是BullBearVote内使用的虚拟分数，没有货币价值，不能提取或兑换金钱或金融资产。",
          "结果取决于网站结算规则和可用市场数据。缺失或更正的数据、市场关闭或技术错误可能延迟结算，或导致结果和积分调整。",
          "过去的预测结果和排行榜位置不证明投资专业能力，也不保证未来表现。",
        ],
      },
      {
        title: "社区内容",
        content: [
          "评论、回复和预测代表个人用户的观点，不一定代表BullBearVote。",
          "社区内容可能不准确、具有误导性或基于推测。帖子热度、点赞数和作者排名不能作为观点可靠性的证据。",
          "内容管理有助于处理不当内容，但不验证每项主张，也不保证立即发现所有有害内容。请举报可能违规的内容。",
        ],
      },
      {
        title: "外部链接",
        content: [
          "网站可能包含新闻及其他第三方网站链接，仅供方便和参考，不代表认可。",
          "我们不控制外部网站的内容、可用性、安全性或隐私做法。访问时适用其自身条款和隐私政策。",
        ],
      },
    ],
  },
  de: {
    help_intro:
      "Hier findest du Antworten zu Prognosen, deiner Watchlist und den Kontoeinstellungen.",
    share_feedback: "Feedback geben",
    feedback_intro:
      "Hast du eine Idee oder funktioniert etwas nicht? Sag uns Bescheid.",
    feedback_question: "Was möchtest du uns mitteilen?",
    your_feedback: "Dein Feedback",
    bug_placeholder: "Was ist passiert und was hattest du erwartet?",
    feedback_placeholder: "Was sollen wir verbessern?",
    unavailable: "Feedback kann derzeit noch nicht gesendet werden.",
    send: "Feedback senden",
    privacy_intro:
      "Erfahre, wie BullBearVote deine Daten verarbeitet und welche Regeln in der Community gelten.",
    disclaimer_intro:
      "Lies diese Einschränkungen, bevor du Marktinformationen, Prognosen oder Community-Inhalte auf BullBearVote nutzt.",
    categories: {
      suggestion: "Vorschlag",
      bug: "Fehler melden",
      other: "Sonstiges",
    },
    help_items: [
      {
        title: "Wie funktionieren Prognosen?",
        content:
          "Wähle Bull oder Bear, um die Richtung eines Index in der nächsten Handelssitzung vorherzusagen. Prognosen sind vor Marktöffnung möglich.",
      },
      {
        title: "Warum ist die Abstimmung geschlossen?",
        content:
          "Während der Markt geöffnet ist, sind keine Abstimmungen möglich. Der Countdown zeigt das nächste Abstimmungsfenster.",
      },
      {
        title: "Welche Märkte unterstützen Prognosen?",
        content:
          "Prognosen sind für Indizes verfügbar. Über Kryptowährungen, Währungen und Rohstoffe kannst du in Kommentaren diskutieren.",
      },
      {
        title: "Wie verwalte ich meine Watchlist?",
        content:
          "Öffne die Watchlist-Verwaltung, um Märkte hinzuzufügen oder zu entfernen. Du kannst bis zu 20 Märkte aufnehmen.",
      },
      {
        title: "Kann ich die Sprache ändern?",
        content:
          "Wähle in den Kontoeinstellungen eine Sprache. Deine Auswahl wird automatisch gespeichert.",
      },
    ],
    privacy_terms: [
      {
        title: "Erhobene Informationen",
        content: [
          "Bei der Anmeldung mit Google oder GitHub erhalten wir Kontodaten wie E-Mail-Adresse, Benutzername, Profilbild und die Kontokennung des Anbieters.",
          "Wir speichern deine gewählte Nationalität, Sprache und Watchlist sowie Aktivitäten wie Kommentare, Antworten, Prognosen, Punkteverlauf, Likes und Meldungen.",
          "Cookies erhalten deine Anmeldung. Lokaler Speicher kann Einstellungen wie das Design speichern. Temporäre Zwischenspeicher beschleunigen Seiten und Marktinformationen.",
        ],
      },
      {
        title: "Verwendung der Informationen",
        content: [
          "Wir verwenden Daten zur Kontoverwaltung, zum Speichern von Einstellungen, für Community-Funktionen, Prognosen und Punkte sowie zur Missbrauchsprävention.",
          "Benutzername, Profilbild und öffentliche Beiträge können anderen angezeigt werden. Deine Nationalität kann bei Beiträgen oder Länderstatistiken erscheinen. E-Mail-Adresse und Authentifizierungsdaten werden nicht öffentlich angezeigt.",
          "Dienstleister für Authentifizierung, Hosting und Speicherung können für den Betrieb nötige Daten verarbeiten. Daten können auch offengelegt werden, wenn geltendes Recht dies verlangt.",
        ],
      },
      {
        title: "Speicherung und Aufbewahrung",
        content: [
          "Daten werden bei den Diensten gespeichert, die BullBearVote unterstützen. Anbieter können sie außerhalb deines Wohnsitzlandes verarbeiten.",
          "Wir bewahren Daten so lange auf, wie für Konten und Funktionen, Prognoseaufzeichnungen, Missbrauchs- oder Streitfälle und gesetzliche Pflichten nötig. Die Dauer hängt von Datenart und Zweck ab.",
          "Temporäre Caches können früher ablaufen als Kontodaten. Gelöschte Informationen können in Backups bleiben, bis diese ersetzt werden oder ablaufen.",
        ],
      },
      {
        title: "Kontolöschung",
        content: [
          "Du kannst über die unten genannten Kontaktdaten eine Löschung beantragen. Vor der Bearbeitung können wir einen Nachweis der Kontoinhaberschaft verlangen.",
          "Wir erläutern die Folgen für Profil, Kommentare, Antworten, Prognosen und Punkteverlauf sowie notwendige Aufbewahrungen und deren Gründe.",
          "Abmelden, Cookies löschen oder die Verbindung zu Google oder GitHub trennen löscht dein BullBearVote-Konto nicht automatisch.",
        ],
      },
      {
        title: "Community-Regeln",
        content: [
          "Diskutiere respektvoll und passend zum Markt oder Thema. Widerspruch ist willkommen; Belästigung, Drohungen, Hassrede und gezielte Angriffe sind verboten.",
          "Veröffentliche keinen Spam, unerwünschte Werbung, Betrug, explizit sexuelle Inhalte oder private Daten anderer. Gib dich nicht als jemand anderes aus und teile keine Inhalte ohne Nutzungsrecht.",
          "Manipuliere Prognosen, Punkte, Likes oder Ranglisten nicht durch mehrere Konten, Automatisierung oder Ausnutzung von Fehlern.",
          "Verstöße können zur Einschränkung oder Entfernung von Inhalten führen. Wiederholte oder schwere Verstöße können Kontoeinschränkungen oder Sperren bewirken. Unangemessene Inhalte kannst du melden.",
        ],
      },
      {
        title: "Nutzungsbedingungen",
        content: [
          "BullBearVote bietet Marktdiskussionen und ein virtuelles Prognosespiel, keine Brokerage-Dienste oder Handelsausführung. Du bist für Kontoaktivitäten und eingereichte Inhalte verantwortlich.",
          "Du behältst das Eigentum an deinen Inhalten. Durch Einreichung erlaubst du BullBearVote deren Speicherung, Anzeige und Verarbeitung, soweit für Betrieb und Moderation nötig.",
          "Prognosen, Beiträge, Ranglisten und Marktinformationen sind keine Finanzberatung. Punkte haben keinen Geldwert und sind nicht gegen Bargeld einlösbar.",
          "Marktdaten und Ergebnisse können Fehler enthalten. Erkannte Daten- oder Verarbeitungsfehler können zu Korrekturen von Ergebnissen und Punkten führen.",
          "Funktionen und Regeln können sich ändern; ein unterbrechungsfreier Betrieb wird nicht garantiert. Bedingungen können bei Änderungen aktualisiert werden. Gesetzlich nicht ausschließbare Rechte werden nicht eingeschränkt.",
        ],
      },
      {
        title: "Kontakt",
        content: [
          "Fragen zum Datenschutz, Kontolöschung, Auskunft oder Berichtigung personenbezogener Daten sowie Anliegen zur Moderation richtest du an {email}.",
          "Nenne deinen Benutzernamen und ausreichend Details. Sende niemals Passwörter, Anmeldecodes oder Authentifizierungstoken.",
        ],
      },
    ],
    disclaimer: [
      {
        title: "Zweck dieser Website",
        content: [
          "BullBearVote ist eine Community für Diskussionen über globale Märkte und virtuelle Prognosen zur Indexentwicklung.",
          "Informationen dienen allgemeiner Information, Diskussion und Unterhaltung. Sie sind weder Anlageberatung noch Empfehlungen zum Kauf, Verkauf oder Halten von Finanzanlagen.",
          "Du bist für deine finanziellen Entscheidungen verantwortlich. Berücksichtige deine Situation und hole bei Bedarf qualifizierten Rat ein.",
        ],
      },
      {
        title: "Marktdaten und Verfügbarkeit",
        content: [
          "Kurse, Charts, Handelszeiten, Nachrichten und weitere Daten stammen von Dritten und können verzögert, unvollständig oder falsch sein.",
          "Feiertage, Zeitplanänderungen, Anbieterbeschränkungen oder technische Probleme können Marktstatus und Datenverfügbarkeit beeinflussen. Charts können die letzte verfügbare Sitzung statt des heutigen Tages zeigen.",
          "Richtigkeit, Vollständigkeit und Aktualität werden nicht garantiert. Prüfe Informationen unabhängig, bevor du finanzielle Entscheidungen darauf stützt.",
        ],
      },
      {
        title: "Prognosen und Punkte",
        content: [
          "Prognosen gehören zu einem virtuellen Spiel und sind für unterstützte Indizes vor der jeweiligen Marktöffnung möglich. Bei geöffnetem Markt ist die Abstimmung geschlossen.",
          "Punkte sind virtuelle Bewertungen ohne Geldwert. Sie können nicht ausgezahlt, gegen Geld getauscht oder für Finanzanlagen eingelöst werden.",
          "Ergebnisse hängen von Abrechnungsregeln und verfügbaren Marktdaten ab. Fehlende oder korrigierte Daten, Marktschließungen und technische Fehler können Abrechnungen verzögern oder Anpassungen erfordern.",
          "Vergangene Ergebnisse und Ranglistenplätze belegen keine Anlagekompetenz und garantieren keine künftige Leistung.",
        ],
      },
      {
        title: "Community-Inhalte",
        content: [
          "Kommentare, Antworten und Prognosen sind Ansichten einzelner Nutzer und spiegeln nicht notwendigerweise BullBearVote wider.",
          "Inhalte können falsch, irreführend oder spekulativ sein. Beliebtheit, Likes und Autorenrang sind kein Nachweis der Zuverlässigkeit.",
          "Moderation hilft bei unangemessenen Inhalten, überprüft aber nicht jede Behauptung und garantiert keine sofortige Erkennung aller schädlichen Inhalte. Melde mögliche Regelverstöße.",
        ],
      },
      {
        title: "Externe Links",
        content: [
          "Links zu Nachrichten und anderen Drittanbieter-Websites dienen Komfort und Referenz und bedeuten keine Unterstützung.",
          "Wir kontrollieren weder Inhalte, Verfügbarkeit, Sicherheit noch Datenschutz externer Websites. Bei deren Besuch gelten ihre eigenen Bedingungen und Datenschutzrichtlinien.",
        ],
      },
    ],
  },
  fr: {
    help_intro:
      "Retrouvez les réponses sur les prévisions, votre liste de suivi et les paramètres du compte.",
    share_feedback: "Partager un avis",
    feedback_intro:
      "Une idée ou quelque chose qui ne fonctionne pas ? Dites-le-nous.",
    feedback_question: "Que souhaitez-vous partager ?",
    your_feedback: "Votre avis",
    bug_placeholder: "Que s’est-il passé et à quoi vous attendiez-vous ?",
    feedback_placeholder: "Que souhaitez-vous voir amélioré ?",
    unavailable: "L’envoi de commentaires n’est pas encore disponible.",
    send: "Envoyer votre avis",
    privacy_intro:
      "Découvrez comment BullBearVote traite vos informations et les règles d’utilisation de la communauté.",
    disclaimer_intro:
      "Lisez ces limites avant d’utiliser les informations de marché, les prévisions ou les contenus de la communauté.",
    categories: {
      suggestion: "Suggestion",
      bug: "Signaler un bug",
      other: "Autre",
    },
    help_items: [
      {
        title: "Comment fonctionnent les prévisions ?",
        content:
          "Choisissez Bull ou Bear pour prévoir la direction d’un indice lors de sa prochaine séance. Les prévisions sont ouvertes avant l’ouverture du marché.",
      },
      {
        title: "Pourquoi le vote est-il fermé ?",
        content:
          "Le vote est fermé pendant les heures d’ouverture du marché. Consultez le compte à rebours pour la prochaine période de vote.",
      },
      {
        title: "Quels marchés permettent les prévisions ?",
        content:
          "Les prévisions concernent les indices. Les commentaires permettent de discuter des cryptomonnaies, devises et matières premières.",
      },
      {
        title: "Comment gérer ma liste de suivi ?",
        content:
          "Ouvrez la gestion de la liste de suivi pour ajouter ou retirer des marchés. Vous pouvez en suivre jusqu’à 20.",
      },
      {
        title: "Puis-je changer de langue ?",
        content:
          "Choisissez une langue dans les paramètres du compte. Elle est enregistrée automatiquement.",
      },
    ],
    privacy_terms: [
      {
        title: "Informations collectées",
        content: [
          "Lors d’une connexion via Google ou GitHub, nous recevons notamment votre adresse e-mail, nom d’utilisateur, photo et identifiant de compte du fournisseur.",
          "Nous conservons la nationalité, la langue et la liste de suivi choisies, ainsi que vos commentaires, réponses, prévisions, historique de points, mentions J’aime et signalements.",
          "Les cookies maintiennent votre session. Le stockage local peut mémoriser des préférences comme le thème. Des caches temporaires accélèrent le chargement des pages et des données de marché.",
        ],
      },
      {
        title: "Utilisation des informations",
        content: [
          "Les informations servent à gérer le compte, mémoriser les préférences, proposer les fonctions communautaires, traiter prévisions et points et prévenir les abus.",
          "Votre nom, photo et contributions publiques peuvent être visibles. Votre nationalité peut apparaître dans vos contributions ou les statistiques par pays. Votre e-mail et vos données d’authentification ne sont pas publics.",
          "Les prestataires d’authentification, d’hébergement et de stockage peuvent traiter les données nécessaires au fonctionnement. Des informations peuvent être divulguées si la loi applicable l’exige.",
        ],
      },
      {
        title: "Stockage et conservation",
        content: [
          "Les données sont stockées auprès des services soutenant BullBearVote, qui peuvent les traiter dans d’autres pays que votre pays de résidence.",
          "Nous les conservons le temps nécessaire au compte et aux fonctions, aux archives de prévisions, au traitement des abus ou litiges et aux obligations légales. La durée dépend du type de donnée et de son usage.",
          "Les caches peuvent expirer avant les données du compte. Des données supprimées peuvent subsister dans les sauvegardes jusqu’à leur remplacement ou expiration.",
        ],
      },
      {
        title: "Suppression du compte",
        content: [
          "Demandez la suppression aux coordonnées ci-dessous. Nous pouvons vérifier que vous êtes titulaire du compte avant de traiter la demande.",
          "Nous expliquerons les effets sur votre profil, commentaires, réponses, prévisions et points, ainsi que les informations à conserver et les raisons.",
          "Se déconnecter, supprimer les cookies ou dissocier Google ou GitHub ne supprime pas à lui seul votre compte BullBearVote.",
        ],
      },
      {
        title: "Règles de la communauté",
        content: [
          "Restez respectueux et dans le sujet. Les désaccords sont bienvenus ; harcèlement, menaces, propos haineux et attaques ciblées sont interdits.",
          "Ne publiez ni spam, publicité non sollicitée, escroquerie, contenu sexuel explicite ni informations privées d’autrui. N’usurpez pas d’identité et ne partagez pas de contenu sans autorisation.",
          "Ne manipulez pas prévisions, points, mentions J’aime ou classements par plusieurs comptes, automatisation ou exploitation d’erreurs.",
          "Les contenus contraires aux règles peuvent être restreints ou supprimés. Des violations répétées ou graves peuvent entraîner des restrictions ou une suspension. Vous pouvez signaler un contenu inapproprié.",
        ],
      },
      {
        title: "Conditions d’utilisation",
        content: [
          "BullBearVote propose des discussions et un jeu de prévisions virtuelles, sans courtage ni exécution de transactions. Vous êtes responsable des activités de votre compte et des contenus soumis.",
          "Vous restez propriétaire de vos contenus. Leur soumission autorise BullBearVote à les stocker, afficher et traiter pour exploiter et modérer le service.",
          "Prévisions, publications, classements et informations ne sont pas des conseils financiers. Les points n’ont aucune valeur monétaire et ne sont pas échangeables contre de l’argent.",
          "Des erreurs de données ou de résultats sont possibles. Les résultats et points peuvent être corrigés après identification d’une erreur de données ou de traitement.",
          "Les fonctions et règles peuvent évoluer ; la continuité du service n’est pas garantie. Les conditions peuvent être mises à jour. Aucun droit qui ne peut être exclu par la loi applicable n’est limité.",
        ],
      },
      {
        title: "Contact",
        content: [
          "Pour la confidentialité, la suppression du compte, l’accès ou la rectification de données personnelles ou la modération, contactez {email}.",
          "Indiquez votre nom d’utilisateur et assez de détails pour comprendre la demande. N’envoyez jamais de mot de passe, code de connexion ou jeton d’authentification.",
        ],
      },
    ],
    disclaimer: [
      {
        title: "Objet du site",
        content: [
          "BullBearVote est une plateforme communautaire de discussion sur les marchés mondiaux et de prévisions virtuelles sur les indices.",
          "Les informations sont fournies à des fins générales, de discussion et de divertissement, sans conseil en investissement ni recommandation d’achat, de vente ou de détention d’actifs financiers.",
          "Vous êtes responsable de vos décisions financières. Tenez compte de votre situation et consultez un professionnel qualifié si nécessaire.",
        ],
      },
      {
        title: "Données de marché et disponibilité",
        content: [
          "Cours, graphiques, horaires, actualités et autres données proviennent de tiers et peuvent être retardés, incomplets ou inexacts.",
          "Jours fériés, changements d’horaires, limites des fournisseurs et problèmes techniques peuvent affecter l’état du marché et les données. Les graphiques peuvent montrer la dernière séance disponible plutôt qu’aujourd’hui.",
          "L’exactitude, l’exhaustivité et l’actualité ne sont pas garanties. Vérifiez indépendamment les informations avant toute décision financière.",
        ],
      },
      {
        title: "Prévisions et points",
        content: [
          "Les prévisions sont un jeu virtuel, disponible pour les indices pris en charge avant la séance concernée. Le vote ferme durant l’ouverture du marché.",
          "Les points sont des scores virtuels sans valeur monétaire, non retirables et non échangeables contre de l’argent ou des actifs financiers.",
          "Les résultats dépendent des règles de règlement et des données disponibles. Données absentes ou corrigées, fermetures et erreurs techniques peuvent retarder le règlement ou nécessiter des ajustements.",
          "Les résultats passés et les classements ne prouvent pas une expertise en investissement et ne garantissent pas les performances futures.",
        ],
      },
      {
        title: "Contenus communautaires",
        content: [
          "Les commentaires, réponses et prévisions reflètent leurs auteurs, pas nécessairement BullBearVote.",
          "Ils peuvent être inexacts, trompeurs ou spéculatifs. La popularité, les mentions J’aime et le classement de l’auteur ne prouvent pas leur fiabilité.",
          "La modération aide à traiter les contenus inappropriés sans vérifier chaque affirmation ni garantir la détection immédiate de tous les contenus nuisibles. Signalez les infractions possibles.",
        ],
      },
      {
        title: "Liens externes",
        content: [
          "Les liens vers des articles ou sites tiers sont fournis pour faciliter la consultation et ne constituent pas une approbation.",
          "Nous ne contrôlons ni leur contenu, disponibilité, sécurité ni pratiques de confidentialité. Leurs propres conditions et politiques s’appliquent.",
        ],
      },
    ],
  },
  es: {
    help_intro:
      "Encuentra respuestas sobre predicciones, tu lista de seguimiento y los ajustes de cuenta.",
    share_feedback: "Compartir comentarios",
    feedback_intro: "¿Tienes una idea o algo no funciona? Cuéntanos.",
    feedback_question: "¿Qué te gustaría compartir?",
    your_feedback: "Tus comentarios",
    bug_placeholder: "¿Qué ocurrió y qué esperabas que ocurriera?",
    feedback_placeholder: "¿Qué te gustaría que mejoráramos?",
    unavailable: "El envío de comentarios aún no está disponible.",
    send: "Enviar comentarios",
    privacy_intro:
      "Conoce cómo BullBearVote trata tu información y las reglas de la comunidad.",
    disclaimer_intro:
      "Lee estas limitaciones antes de usar información de mercado, predicciones o contenido de la comunidad.",
    categories: {
      suggestion: "Sugerencia",
      bug: "Informar de un error",
      other: "Otro",
    },
    help_items: [
      {
        title: "¿Cómo funcionan las predicciones?",
        content:
          "Elige Bull o Bear para predecir la dirección de un índice en su próxima sesión. Puedes participar antes de que abra el mercado.",
      },
      {
        title: "¿Por qué está cerrada la votación?",
        content:
          "La votación se cierra mientras el mercado está abierto. Consulta la cuenta atrás para la siguiente oportunidad de votar.",
      },
      {
        title: "¿Qué mercados admiten predicciones?",
        content:
          "Las predicciones están disponibles para índices. Puedes comentar sobre criptomonedas, divisas y materias primas.",
      },
      {
        title: "¿Cómo gestiono mi lista de seguimiento?",
        content:
          "Abre la gestión de la lista para añadir o quitar mercados. Puedes seguir hasta 20.",
      },
      {
        title: "¿Puedo cambiar de idioma?",
        content:
          "Selecciona un idioma en los ajustes de cuenta. Se guarda automáticamente.",
      },
    ],
    privacy_terms: [
      {
        title: "Información que recopilamos",
        content: [
          "Al iniciar sesión con Google o GitHub recibimos datos como correo electrónico, nombre de usuario, imagen de perfil e identificador de cuenta del proveedor.",
          "Guardamos tu nacionalidad, idioma y lista de seguimiento, así como comentarios, respuestas, predicciones, historial de puntos, Me gusta y denuncias.",
          "Las cookies mantienen tu sesión. El almacenamiento local puede recordar preferencias como el tema. Los datos temporales en caché aceleran las páginas y la información de mercado.",
        ],
      },
      {
        title: "Uso de la información",
        content: [
          "Usamos la información para gestionar tu cuenta, recordar preferencias, ofrecer funciones comunitarias, procesar predicciones y puntos y prevenir abusos.",
          "El nombre, imagen y aportaciones públicas pueden ser visibles para otros. La nacionalidad puede aparecer junto a aportaciones o estadísticas por país. El correo y los datos de autenticación no son públicos.",
          "Los proveedores de autenticación, alojamiento y almacenamiento pueden procesar los datos necesarios para operar el sitio. También pueden divulgarse cuando lo exija la ley aplicable.",
        ],
      },
      {
        title: "Almacenamiento y conservación",
        content: [
          "Los datos se almacenan en servicios que apoyan BullBearVote y pueden procesarse en países distintos del de residencia.",
          "Se conservan el tiempo necesario para cuentas y funciones, registros de predicción, abusos o disputas y obligaciones legales. El plazo depende del tipo de datos y su finalidad.",
          "La caché puede caducar antes que los registros de cuenta. Los datos eliminados pueden permanecer en copias de seguridad hasta su sustitución o caducidad.",
        ],
      },
      {
        title: "Eliminación de cuenta",
        content: [
          "Puedes solicitarla mediante los datos de contacto de abajo. Podemos pedir que verifiques la titularidad antes de tramitarla.",
          "Explicaremos cómo afecta a tu perfil, comentarios, respuestas, predicciones y puntos, y qué información debe conservarse y por qué.",
          "Cerrar sesión, borrar cookies o desconectar Google o GitHub no elimina por sí solo tu cuenta BullBearVote.",
        ],
      },
      {
        title: "Normas de la comunidad",
        content: [
          "Debate con respeto y sobre el mercado o tema. Se admite el desacuerdo, pero no acoso, amenazas, discurso de odio ni ataques dirigidos.",
          "No publiques spam, publicidad no solicitada, estafas, contenido sexual explícito ni información privada ajena. No suplantes identidades ni compartas contenido sin autorización.",
          "No manipules predicciones, puntos, Me gusta o clasificaciones con varias cuentas, automatización o fallos del sitio.",
          "El contenido infractor puede restringirse o eliminarse. Las infracciones graves o repetidas pueden causar restricciones o suspensión de cuenta. Puedes denunciar contenido inapropiado.",
        ],
      },
      {
        title: "Condiciones de uso",
        content: [
          "BullBearVote ofrece debate y un juego de predicción virtual; no presta servicios de intermediación ni ejecuta operaciones. Eres responsable de tu cuenta y contenido.",
          "Conservas la propiedad de tu contenido. Al enviarlo autorizas su almacenamiento, visualización y procesamiento para operar y moderar el servicio.",
          "Las predicciones, publicaciones, clasificaciones e información no son asesoramiento financiero. Los puntos no tienen valor monetario ni se canjean por efectivo.",
          "Los datos y resultados pueden contener errores. Los resultados y puntos pueden corregirse al detectar errores de datos o procesamiento.",
          "Las funciones y reglas pueden cambiar y no se garantiza un servicio ininterrumpido. Las condiciones pueden actualizarse. No se limitan derechos que no puedan excluirse conforme a la ley aplicable.",
        ],
      },
      {
        title: "Contacto",
        content: [
          "Para privacidad, eliminación de cuenta, acceso o corrección de datos personales y asuntos de moderación, escribe a {email}.",
          "Incluye tu nombre de usuario y detalles suficientes. Nunca envíes contraseñas, códigos de acceso ni tokens de autenticación.",
        ],
      },
    ],
    disclaimer: [
      {
        title: "Finalidad del sitio",
        content: [
          "BullBearVote es una comunidad para debatir sobre mercados globales y hacer predicciones virtuales sobre índices.",
          "La información se ofrece para información general, debate y entretenimiento. No es asesoramiento de inversión ni recomendación de comprar, vender o mantener activos financieros.",
          "Eres responsable de tus decisiones financieras. Considera tus circunstancias y busca asesoramiento profesional cualificado cuando sea necesario.",
        ],
      },
      {
        title: "Datos de mercado y disponibilidad",
        content: [
          "Precios, gráficos, horarios, noticias y otros datos proceden de terceros y pueden llegar tarde, estar incompletos o ser inexactos.",
          "Festivos, cambios de horarios, límites de proveedores y problemas técnicos pueden afectar al estado mostrado y a los datos. Los gráficos pueden mostrar la última sesión disponible en lugar de hoy.",
          "No garantizamos exactitud, integridad ni actualidad. Verifica la información de forma independiente antes de tomar decisiones financieras.",
        ],
      },
      {
        title: "Predicciones y puntos",
        content: [
          "Las predicciones forman parte de un juego virtual para índices admitidos antes de la sesión correspondiente. La votación cierra mientras el mercado está abierto.",
          "Los puntos son puntuaciones virtuales sin valor monetario; no pueden retirarse ni canjearse por dinero o activos financieros.",
          "Los resultados dependen de las reglas de liquidación y los datos disponibles. Datos ausentes o corregidos, cierres y errores técnicos pueden retrasar la liquidación o exigir ajustes.",
          "Los resultados pasados y puestos de clasificación no acreditan conocimientos de inversión ni garantizan rendimientos futuros.",
        ],
      },
      {
        title: "Contenido de la comunidad",
        content: [
          "Los comentarios, respuestas y predicciones reflejan a cada usuario, no necesariamente a BullBearVote.",
          "Pueden ser inexactos, engañosos o especulativos. La popularidad, los Me gusta o la clasificación del autor no prueban fiabilidad.",
          "La moderación aborda contenido inapropiado, pero no verifica cada afirmación ni garantiza detectar inmediatamente todo contenido perjudicial. Denuncia posibles infracciones.",
        ],
      },
      {
        title: "Enlaces externos",
        content: [
          "Los enlaces a noticias y sitios de terceros se ofrecen por comodidad y referencia, sin implicar respaldo.",
          "No controlamos su contenido, disponibilidad, seguridad ni privacidad. Sus propias condiciones y políticas se aplican al visitarlos.",
        ],
      },
    ],
  },
  pt: {
    help_intro:
      "Encontre respostas sobre previsões, sua lista de acompanhamento e configurações da conta.",
    share_feedback: "Compartilhar feedback",
    feedback_intro: "Tem uma ideia ou algo não funciona? Conte para nós.",
    feedback_question: "O que você gostaria de compartilhar?",
    your_feedback: "Seu feedback",
    bug_placeholder: "O que aconteceu e o que você esperava que acontecesse?",
    feedback_placeholder: "O que você gostaria que melhorássemos?",
    unavailable: "O envio de feedback ainda não está disponível.",
    send: "Enviar feedback",
    privacy_intro:
      "Saiba como o BullBearVote trata suas informações e quais regras se aplicam à comunidade.",
    disclaimer_intro:
      "Leia estas limitações antes de usar informações de mercado, previsões ou conteúdos da comunidade.",
    categories: {
      suggestion: "Sugestão",
      bug: "Relatar um erro",
      other: "Outro",
    },
    help_items: [
      {
        title: "Como funcionam as previsões?",
        content:
          "Escolha Bull ou Bear para prever a direção de um índice na próxima sessão. Você pode participar antes da abertura do mercado.",
      },
      {
        title: "Por que a votação está fechada?",
        content:
          "A votação fica fechada enquanto o mercado está aberto. Veja a contagem regressiva para o próximo período de votação.",
      },
      {
        title: "Quais mercados permitem previsões?",
        content:
          "As previsões estão disponíveis para índices. Você pode discutir criptomoedas, moedas e commodities nos comentários.",
      },
      {
        title: "Como gerencio minha lista de acompanhamento?",
        content:
          "Abra o gerenciamento da lista para adicionar ou remover mercados. Você pode acompanhar até 20.",
      },
      {
        title: "Posso mudar o idioma?",
        content:
          "Selecione um idioma nas configurações da conta. A escolha é salva automaticamente.",
      },
    ],
    privacy_terms: [
      {
        title: "Informações coletadas",
        content: [
          "Ao entrar com Google ou GitHub, recebemos dados como e-mail, nome de usuário, foto e identificador de conta do provedor.",
          "Armazenamos nacionalidade, idioma e lista de acompanhamento escolhidos, além de comentários, respostas, previsões, histórico de pontos, curtidas e denúncias.",
          "Cookies mantêm sua sessão. O armazenamento local pode lembrar preferências como o tema. Caches temporários aceleram páginas e informações de mercado.",
        ],
      },
      {
        title: "Uso das informações",
        content: [
          "Usamos informações para gerenciar contas, lembrar preferências, oferecer funções comunitárias, processar previsões e pontos e prevenir abusos.",
          "Nome, foto e contribuições públicas podem ser visíveis a outros. A nacionalidade pode aparecer em contribuições ou estatísticas por país. E-mail e dados de autenticação não são públicos.",
          "Provedores de autenticação, hospedagem e armazenamento podem processar dados necessários à operação. Informações também podem ser divulgadas quando exigido pela lei aplicável.",
        ],
      },
      {
        title: "Armazenamento e retenção",
        content: [
          "As informações ficam nos serviços que sustentam o BullBearVote e podem ser processadas fora do país de residência.",
          "São mantidas pelo tempo necessário às contas e funções, aos registros de previsões, ao tratamento de abusos ou disputas e às obrigações legais. O prazo depende do tipo e da finalidade.",
          "Caches podem expirar antes dos registros da conta. Dados excluídos podem permanecer em backups até serem substituídos ou expirarem.",
        ],
      },
      {
        title: "Exclusão da conta",
        content: [
          "Você pode solicitar exclusão pelo contato abaixo. Podemos verificar a titularidade antes de processar o pedido.",
          "Explicaremos os efeitos sobre perfil, comentários, respostas, previsões e pontos, incluindo dados que devem ser mantidos e os motivos.",
          "Sair da conta, limpar cookies ou desconectar Google ou GitHub não exclui por si só sua conta BullBearVote.",
        ],
      },
      {
        title: "Regras da comunidade",
        content: [
          "Mantenha respeito e relevância ao mercado ou assunto. Discordâncias são bem-vindas; assédio, ameaças, discurso de ódio e ataques direcionados não são permitidos.",
          "Não publique spam, publicidade não solicitada, golpes, conteúdo sexual explícito ou informações privadas de terceiros. Não se passe por outras pessoas nem compartilhe conteúdo sem permissão.",
          "Não manipule previsões, pontos, curtidas ou rankings por múltiplas contas, automação ou exploração de erros.",
          "Conteúdo infrator pode ser restrito ou removido. Violações repetidas ou graves podem causar restrições ou suspensão da conta. Você pode denunciar conteúdo inadequado.",
        ],
      },
      {
        title: "Termos de uso",
        content: [
          "O BullBearVote oferece discussão e um jogo virtual de previsões, sem corretagem ou execução de negociações. Você é responsável por sua conta e conteúdo enviado.",
          "Você mantém a propriedade do conteúdo. Ao enviá-lo, permite armazenamento, exibição e processamento necessários à operação e moderação do serviço.",
          "Previsões, publicações, rankings e informações não são aconselhamento financeiro. Pontos não têm valor monetário nem podem ser trocados por dinheiro.",
          "Dados e resultados podem conter erros. Resultados e pontos podem ser corrigidos quando erros de dados ou processamento forem identificados.",
          "Funções e regras podem mudar, e o serviço ininterrupto não é garantido. Os termos podem ser atualizados. Direitos que não podem ser excluídos pela lei aplicável não são limitados.",
        ],
      },
      {
        title: "Contato",
        content: [
          "Para privacidade, exclusão da conta, acesso ou correção de dados pessoais e questões de moderação, entre em contato pelo {email}.",
          "Inclua seu nome de usuário e detalhes suficientes. Nunca envie senha, códigos de acesso ou tokens de autenticação.",
        ],
      },
    ],
    disclaimer: [
      {
        title: "Finalidade do site",
        content: [
          "O BullBearVote é uma comunidade para discutir mercados globais e fazer previsões virtuais sobre índices.",
          "Informações servem à informação geral, discussão e entretenimento, sem aconselhamento de investimento ou recomendação de comprar, vender ou manter ativos financeiros.",
          "Você é responsável por suas decisões financeiras. Considere suas circunstâncias e procure orientação profissional qualificada quando necessário.",
        ],
      },
      {
        title: "Dados de mercado e disponibilidade",
        content: [
          "Preços, gráficos, horários, notícias e outros dados vêm de terceiros e podem estar atrasados, incompletos ou incorretos.",
          "Feriados, mudanças de horários, limites dos provedores e problemas técnicos podem afetar o status mostrado e os dados. Gráficos podem exibir a última sessão disponível em vez do dia atual.",
          "Não garantimos precisão, integridade ou atualização. Verifique informações independentemente antes de decisões financeiras.",
        ],
      },
      {
        title: "Previsões e pontos",
        content: [
          "Previsões são parte de um jogo virtual para índices suportados antes da sessão correspondente. A votação fecha durante o mercado aberto.",
          "Pontos são pontuações virtuais sem valor monetário, não podem ser sacados nem trocados por dinheiro ou ativos financeiros.",
          "Resultados dependem das regras de liquidação e dos dados disponíveis. Dados ausentes ou corrigidos, fechamentos e erros técnicos podem atrasar a liquidação ou exigir ajustes.",
          "Resultados anteriores e posições no ranking não comprovam conhecimento de investimentos nem garantem desempenho futuro.",
        ],
      },
      {
        title: "Conteúdo da comunidade",
        content: [
          "Comentários, respostas e previsões expressam opiniões individuais, não necessariamente as do BullBearVote.",
          "Podem ser incorretos, enganosos ou especulativos. Popularidade, curtidas e ranking do autor não provam confiabilidade.",
          "A moderação ajuda a tratar conteúdo inadequado, mas não verifica toda alegação nem garante detecção imediata de todo conteúdo nocivo. Denuncie possíveis violações.",
        ],
      },
      {
        title: "Links externos",
        content: [
          "Links a notícias e sites de terceiros são oferecidos por conveniência e referência, sem endosso.",
          "Não controlamos conteúdo, disponibilidade, segurança ou privacidade desses sites. Seus próprios termos e políticas se aplicam.",
        ],
      },
    ],
  },
  it: {
    help_intro:
      "Trova risposte su previsioni, watchlist e impostazioni dell’account.",
    share_feedback: "Condividi un feedback",
    feedback_intro: "Hai un’idea o qualcosa non funziona? Raccontacelo.",
    feedback_question: "Cosa vorresti condividere?",
    your_feedback: "Il tuo feedback",
    bug_placeholder: "Cosa è successo e cosa ti aspettavi?",
    feedback_placeholder: "Cosa vorresti che migliorassimo?",
    unavailable: "L’invio di feedback non è ancora disponibile.",
    send: "Invia feedback",
    privacy_intro:
      "Scopri come BullBearVote tratta i tuoi dati e quali regole si applicano alla community.",
    disclaimer_intro:
      "Leggi queste limitazioni prima di usare informazioni di mercato, previsioni o contenuti della community.",
    categories: {
      suggestion: "Suggerimento",
      bug: "Segnala un errore",
      other: "Altro",
    },
    help_items: [
      {
        title: "Come funzionano le previsioni?",
        content:
          "Scegli Bull o Bear per prevedere la direzione di un indice nella prossima sessione. Puoi partecipare prima dell’apertura del mercato.",
      },
      {
        title: "Perché il voto è chiuso?",
        content:
          "Il voto è chiuso mentre il mercato è aperto. Consulta il conto alla rovescia per il prossimo periodo di voto.",
      },
      {
        title: "Quali mercati supportano le previsioni?",
        content:
          "Le previsioni sono disponibili per gli indici. Puoi discutere di criptovalute, valute e materie prime nei commenti.",
      },
      {
        title: "Come gestisco la watchlist?",
        content:
          "Apri la gestione della watchlist per aggiungere o rimuovere mercati. Puoi seguirne fino a 20.",
      },
      {
        title: "Posso cambiare lingua?",
        content:
          "Seleziona una lingua nelle impostazioni dell’account. La scelta viene salvata automaticamente.",
      },
    ],
    privacy_terms: [
      {
        title: "Informazioni raccolte",
        content: [
          "Accedendo con Google o GitHub riceviamo dati come e-mail, nome utente, immagine e identificativo dell’account del provider.",
          "Salviamo nazionalità, lingua e watchlist scelte, insieme a commenti, risposte, previsioni, cronologia punti, Mi piace e segnalazioni.",
          "I cookie mantengono la sessione. L’archiviazione locale può ricordare preferenze come il tema. Le cache temporanee velocizzano pagine e informazioni di mercato.",
        ],
      },
      {
        title: "Uso delle informazioni",
        content: [
          "I dati servono a gestire account e preferenze, offrire funzioni della community, elaborare previsioni e punti e prevenire abusi.",
          "Nome, immagine e contributi pubblici possono essere visibili ad altri. La nazionalità può apparire nei contributi o nelle statistiche per paese. E-mail e dati di autenticazione non sono pubblici.",
          "Provider di autenticazione, hosting e archiviazione possono trattare dati necessari al servizio. Le informazioni possono essere divulgate quando richiesto dalla legge applicabile.",
        ],
      },
      {
        title: "Archiviazione e conservazione",
        content: [
          "I dati sono conservati presso i servizi che supportano BullBearVote e possono essere trattati fuori dal paese di residenza.",
          "Li conserviamo per il tempo necessario ad account e funzioni, registri delle previsioni, gestione di abusi o controversie e obblighi legali. La durata dipende dal tipo e dalla finalità.",
          "Le cache possono scadere prima dei dati dell’account. I dati eliminati possono restare nei backup fino alla sostituzione o scadenza.",
        ],
      },
      {
        title: "Eliminazione dell’account",
        content: [
          "Puoi richiederla tramite i contatti sotto. Potremmo verificare la titolarità prima di elaborare la richiesta.",
          "Spiegheremo gli effetti su profilo, commenti, risposte, previsioni e punti, incluse informazioni da conservare e relative ragioni.",
          "Uscire, cancellare cookie o scollegare Google o GitHub non elimina da solo l’account BullBearVote.",
        ],
      },
      {
        title: "Regole della community",
        content: [
          "Mantieni rispetto e pertinenza al mercato o tema. Il dissenso è benvenuto, ma molestie, minacce, incitamento all’odio e attacchi mirati sono vietati.",
          "Non pubblicare spam, pubblicità non richiesta, truffe, contenuti sessuali espliciti o informazioni private altrui. Non impersonare altri né condividere contenuti senza permesso.",
          "Non manipolare previsioni, punti, Mi piace o classifiche usando più account, automazione o errori del sito.",
          "I contenuti contrari alle regole possono essere limitati o rimossi. Violazioni ripetute o gravi possono portare a restrizioni o sospensione. Puoi segnalare contenuti inappropriati.",
        ],
      },
      {
        title: "Condizioni d’uso",
        content: [
          "BullBearVote offre discussioni e un gioco di previsioni virtuale, senza intermediazione né esecuzione di operazioni. Sei responsabile dell’attività dell’account e dei contenuti inviati.",
          "Mantieni la proprietà dei contenuti. Inviandoli autorizzi BullBearVote a conservarli, mostrarli ed elaborarli per gestire e moderare il servizio.",
          "Previsioni, post, classifiche e informazioni non sono consulenza finanziaria. I punti non hanno valore monetario né sono convertibili in contanti.",
          "Dati e risultati possono contenere errori. Risultati e punti possono essere corretti quando si rilevano errori di dati o elaborazione.",
          "Funzioni e regole possono cambiare; la continuità del servizio non è garantita. Le condizioni possono essere aggiornate. Non si limitano diritti che la legge applicabile non consente di escludere.",
        ],
      },
      {
        title: "Contatti",
        content: [
          "Per privacy, eliminazione account, accesso o rettifica dei dati personali e questioni di moderazione, contatta {email}.",
          "Includi nome utente e dettagli sufficienti. Non inviare mai password, codici di accesso o token di autenticazione.",
        ],
      },
    ],
    disclaimer: [
      {
        title: "Scopo del sito",
        content: [
          "BullBearVote è una community per discutere mercati globali e fare previsioni virtuali sugli indici.",
          "Le informazioni servono a informazione generale, discussione e intrattenimento. Non sono consulenza d’investimento né raccomandazioni di acquisto, vendita o detenzione di attività finanziarie.",
          "Sei responsabile delle decisioni finanziarie. Considera la tua situazione e chiedi consulenza qualificata se necessario.",
        ],
      },
      {
        title: "Dati di mercato e disponibilità",
        content: [
          "Prezzi, grafici, orari, notizie e altri dati provengono da terzi e possono essere ritardati, incompleti o inesatti.",
          "Festività, variazioni degli orari, limiti dei provider e problemi tecnici possono influire sullo stato del mercato e sui dati. I grafici possono mostrare l’ultima sessione disponibile invece di oggi.",
          "Non garantiamo precisione, completezza o tempestività. Verifica autonomamente prima di decisioni finanziarie.",
        ],
      },
      {
        title: "Previsioni e punti",
        content: [
          "Le previsioni fanno parte di un gioco virtuale per indici supportati prima della sessione pertinente. Il voto chiude mentre il mercato è aperto.",
          "I punti sono punteggi virtuali senza valore monetario, non prelevabili né scambiabili con denaro o attività finanziarie.",
          "I risultati dipendono dalle regole di regolamento e dai dati disponibili. Dati mancanti o corretti, chiusure ed errori tecnici possono ritardare il regolamento o richiedere modifiche.",
          "Risultati passati e posizioni in classifica non dimostrano competenze d’investimento né garantiscono risultati futuri.",
        ],
      },
      {
        title: "Contenuti della community",
        content: [
          "Commenti, risposte e previsioni esprimono opinioni individuali, non necessariamente quelle di BullBearVote.",
          "Possono essere inesatti, ingannevoli o speculativi. Popolarità, Mi piace e classifica dell’autore non sono prove di affidabilità.",
          "La moderazione aiuta a gestire contenuti inappropriati, ma non verifica ogni affermazione né garantisce la scoperta immediata di tutti i contenuti dannosi. Segnala possibili violazioni.",
        ],
      },
      {
        title: "Link esterni",
        content: [
          "Link a notizie e siti di terzi sono forniti per comodità e riferimento, senza implicare approvazione.",
          "Non controlliamo contenuti, disponibilità, sicurezza o privacy dei siti esterni. Si applicano le loro condizioni e informative.",
        ],
      },
    ],
  },
  ru: {
    help_intro:
      "Ответы на вопросы о прогнозах, списке наблюдения и настройках аккаунта.",
    share_feedback: "Поделиться отзывом",
    feedback_intro: "Есть идея или что-то не работает? Расскажите нам.",
    feedback_question: "Чем вы хотите поделиться?",
    your_feedback: "Ваш отзыв",
    bug_placeholder: "Что произошло и какого результата вы ожидали?",
    feedback_placeholder: "Что нам стоит улучшить?",
    unavailable: "Отправка отзывов пока недоступна.",
    send: "Отправить отзыв",
    privacy_intro:
      "Узнайте, как BullBearVote обрабатывает данные и какие правила действуют в сообществе.",
    disclaimer_intro:
      "Прочитайте эти ограничения перед использованием рыночной информации, прогнозов или материалов сообщества.",
    categories: {
      suggestion: "Предложение",
      bug: "Сообщить об ошибке",
      other: "Другое",
    },
    help_items: [
      {
        title: "Как работают прогнозы?",
        content:
          "Выберите Bull или Bear, чтобы спрогнозировать направление индекса в следующей торговой сессии. Прогноз доступен до открытия рынка.",
      },
      {
        title: "Почему голосование закрыто?",
        content:
          "Во время работы рынка голосование закрыто. Следующий период голосования указан в обратном отсчёте рынка.",
      },
      {
        title: "Для каких рынков доступны прогнозы?",
        content:
          "Прогнозы доступны для индексов. Криптовалюты, валюты и сырьё можно обсуждать в комментариях.",
      },
      {
        title: "Как управлять списком наблюдения?",
        content:
          "Откройте управление списком, чтобы добавить или удалить рынки. Можно добавить до 20 рынков.",
      },
      {
        title: "Можно изменить язык?",
        content:
          "Выберите язык в настройках аккаунта. Он сохранится автоматически.",
      },
    ],
    privacy_terms: [
      {
        title: "Какие данные мы собираем",
        content: [
          "При входе через Google или GitHub мы получаем адрес электронной почты, имя пользователя, изображение профиля, идентификатор аккаунта провайдера и другие данные аккаунта.",
          "Мы сохраняем выбранные гражданство, язык и список наблюдения, а также комментарии, ответы, прогнозы, историю баллов, отметки «Нравится» и жалобы.",
          "Cookie поддерживают сеанс входа. Локальное хранилище может запоминать настройки, например тему. Временный кэш ускоряет загрузку страниц и рыночной информации.",
        ],
      },
      {
        title: "Использование данных",
        content: [
          "Данные нужны для управления аккаунтом, сохранения настроек, функций сообщества, обработки прогнозов и баллов и предотвращения злоупотреблений.",
          "Имя, изображение и публичные публикации могут быть видны другим. Гражданство может отображаться у публикаций или в статистике по странам. Почта и данные аутентификации не публикуются.",
          "Провайдеры аутентификации, хостинга и хранения могут обрабатывать данные для работы сайта. Раскрытие также возможно, когда этого требует применимое законодательство.",
        ],
      },
      {
        title: "Хранение данных и сроки",
        content: [
          "Данные хранятся в сервисах, поддерживающих BullBearVote. Обработка может происходить за пределами страны проживания.",
          "Мы храним данные столько, сколько нужно для аккаунта и функций, записей прогнозов, разрешения злоупотреблений или споров и выполнения юридических обязанностей. Срок зависит от вида данных и цели.",
          "Временный кэш может истекать раньше записей аккаунта. Удалённые данные могут оставаться в резервных копиях до их замены или истечения срока.",
        ],
      },
      {
        title: "Удаление аккаунта",
        content: [
          "Запрос можно отправить по контактам ниже. Перед обработкой мы можем попросить подтвердить владение аккаунтом.",
          "Мы объясним последствия для профиля, комментариев, ответов, прогнозов и баллов, а также какие данные необходимо сохранить и почему.",
          "Выход, очистка cookie или отключение Google либо GitHub сами по себе не удаляют аккаунт BullBearVote.",
        ],
      },
      {
        title: "Правила сообщества",
        content: [
          "Общайтесь уважительно и по теме рынка или обсуждения. Несогласие допустимо, но преследование, угрозы, язык ненависти и адресные оскорбления запрещены.",
          "Не публикуйте спам, нежелательную рекламу, мошеннические материалы, откровенный сексуальный контент или чужие личные данные. Не выдавайте себя за других и не делитесь контентом без разрешения.",
          "Не манипулируйте прогнозами, баллами, отметками или рейтингами с помощью нескольких аккаунтов, автоматизации или ошибок сайта.",
          "Нарушающий правила контент может быть ограничен или удалён. Повторные или серьёзные нарушения могут привести к ограничениям или блокировке аккаунта. На неподобающий контент можно пожаловаться.",
        ],
      },
      {
        title: "Условия использования",
        content: [
          "BullBearVote предлагает обсуждение рынков и виртуальную игру прогнозов, не оказывает брокерских услуг и не исполняет сделки. Вы отвечаете за действия аккаунта и отправленный контент.",
          "Вы сохраняете права собственности на контент. Отправляя его, разрешаете BullBearVote хранить, показывать и обрабатывать его для работы и модерации сервиса.",
          "Прогнозы, публикации, рейтинги и рыночные данные не являются финансовыми рекомендациями. Баллы не имеют денежной стоимости и не обмениваются на наличные.",
          "Данные и результаты могут содержать ошибки. При выявлении ошибок данных или обработки результаты и баллы могут быть исправлены.",
          "Функции и правила могут меняться; бесперебойная работа не гарантируется. Условия могут обновляться. Не ограничиваются права, которые нельзя исключить по применимому законодательству.",
        ],
      },
      {
        title: "Контакты",
        content: [
          "По вопросам конфиденциальности, удаления аккаунта, доступа к персональным данным или их исправления и модерации пишите на {email}.",
          "Укажите имя пользователя и достаточные подробности. Никогда не отправляйте пароль, коды входа или токены аутентификации.",
        ],
      },
    ],
    disclaimer: [
      {
        title: "Назначение сайта",
        content: [
          "BullBearVote — сообщество для обсуждения мировых рынков и виртуальных прогнозов движения индексов.",
          "Информация предназначена для общего ознакомления, обсуждения и развлечения. Она не является инвестиционной консультацией или рекомендацией покупать, продавать либо держать финансовые активы.",
          "Вы отвечаете за финансовые решения. Учитывайте свою ситуацию и при необходимости обращайтесь к квалифицированному специалисту.",
        ],
      },
      {
        title: "Рыночные данные и доступность",
        content: [
          "Цены, графики, часы торгов, новости и другие сведения поступают от третьих сторон и могут быть задержанными, неполными или неточными.",
          "Праздники, изменения расписания, ограничения поставщиков и технические проблемы могут влиять на статус рынка и доступность данных. Графики могут показывать последнюю доступную сессию, а не сегодняшний день.",
          "Мы не гарантируем точность, полноту и своевременность. Проверяйте сведения самостоятельно перед финансовыми решениями.",
        ],
      },
      {
        title: "Прогнозы и баллы",
        content: [
          "Прогнозы являются частью виртуальной игры для поддерживаемых индексов до открытия соответствующей сессии. Пока рынок открыт, голосование закрыто.",
          "Баллы — виртуальный счёт без денежной стоимости. Их нельзя вывести или обменять на деньги либо финансовые активы.",
          "Результаты зависят от правил расчёта и доступных данных. Отсутствие или исправление данных, закрытия рынков и технические ошибки могут задержать расчёт или потребовать корректировок.",
          "Прошлые результаты и позиции в рейтинге не подтверждают инвестиционную компетентность и не гарантируют будущие результаты.",
        ],
      },
      {
        title: "Контент сообщества",
        content: [
          "Комментарии, ответы и прогнозы выражают мнения отдельных пользователей, не обязательно BullBearVote.",
          "Они могут быть неточными, вводящими в заблуждение или спекулятивными. Популярность, отметки «Нравится» и рейтинг автора не доказывают надёжность утверждений.",
          "Модерация помогает устранять неподобающий контент, но не проверяет каждое утверждение и не гарантирует немедленное выявление всего вредного контента. Сообщайте о возможных нарушениях.",
        ],
      },
      {
        title: "Внешние ссылки",
        content: [
          "Ссылки на новости и сторонние сайты предоставляются для удобства и справки, без одобрения их содержания.",
          "Мы не контролируем их контент, доступность, безопасность или конфиденциальность. При посещении действуют их собственные условия и политики.",
        ],
      },
    ],
  },
  ar: {
    help_intro: "اعثر على إجابات عن التوقعات وقائمة المتابعة وإعدادات الحساب.",
    share_feedback: "شارك ملاحظاتك",
    feedback_intro: "لديك فكرة أو وجدت شيئًا لا يعمل؟ أخبرنا عنه.",
    feedback_question: "ما الذي تود مشاركته؟",
    your_feedback: "ملاحظاتك",
    bug_placeholder: "ماذا حدث، وماذا كنت تتوقع أن يحدث؟",
    feedback_placeholder: "ما الذي تود أن نحسّنه؟",
    unavailable: "إرسال الملاحظات غير متاح بعد.",
    send: "إرسال الملاحظات",
    privacy_intro:
      "تعرّف على طريقة معالجة BullBearVote لمعلوماتك والقواعد المطبقة عند استخدام المجتمع.",
    disclaimer_intro:
      "اقرأ هذه القيود قبل استخدام معلومات السوق أو التوقعات أو محتوى المجتمع في BullBearVote.",
    categories: {
      suggestion: "اقتراح",
      bug: "الإبلاغ عن خلل",
      other: "أخرى",
    },
    help_items: [
      {
        title: "كيف تعمل التوقعات؟",
        content:
          "اختر Bull أو Bear لتوقع اتجاه مؤشر في جلسة التداول التالية. تتاح التوقعات قبل فتح السوق.",
      },
      {
        title: "لماذا التصويت مغلق؟",
        content:
          "يُغلق التصويت أثناء فتح السوق. راجع العد التنازلي للسوق لمعرفة موعد التصويت التالي.",
      },
      {
        title: "ما الأسواق التي تدعم التوقعات؟",
        content:
          "تتوفر التوقعات للمؤشرات. يمكنك مناقشة العملات المشفرة والعملات والسلع في التعليقات.",
      },
      {
        title: "كيف أدير قائمة المتابعة؟",
        content:
          "افتح إدارة قائمة المتابعة لإضافة الأسواق أو إزالتها. يمكنك متابعة ما يصل إلى 20 سوقًا.",
      },
      {
        title: "هل يمكنني تغيير اللغة؟",
        content: "اختر لغة من إعدادات الحساب. يُحفظ اختيارك تلقائيًا.",
      },
    ],
    privacy_terms: [
      {
        title: "المعلومات التي نجمعها",
        content: [
          "عند الدخول عبر Google أو GitHub نتلقى معلومات الحساب، مثل البريد الإلكتروني واسم المستخدم وصورة الملف ومعرّف الحساب لدى المزوّد.",
          "نحفظ الجنسية واللغة وقائمة المتابعة التي تختارها، وأنشطتك مثل التعليقات والردود والتوقعات وسجل النقاط والإعجابات والبلاغات.",
          "نستخدم ملفات تعريف الارتباط للحفاظ على جلسة الدخول، وقد نستخدم التخزين المحلي لتذكّر إعدادات مثل المظهر. تساعد البيانات المؤقتة المخزنة على تسريع الصفحات ومعلومات السوق.",
        ],
      },
      {
        title: "استخدام المعلومات",
        content: [
          "نستخدم المعلومات لإدارة الحساب وتذكّر الإعدادات وتقديم وظائف المجتمع ومعالجة التوقعات والنقاط ومنع إساءة الاستخدام.",
          "قد يظهر اسم المستخدم والصورة والمساهمات العامة للآخرين. وقد تظهر الجنسية بجانب المساهمات أو في إحصاءات الدول. لا نعرض البريد الإلكتروني أو بيانات المصادقة علنًا.",
          "قد يعالج مزوّدو المصادقة والاستضافة والتخزين المعلومات اللازمة للتشغيل. وقد تُكشف المعلومات إذا أوجب القانون المعمول به ذلك.",
        ],
      },
      {
        title: "تخزين البيانات والاحتفاظ بها",
        content: [
          "تُخزّن المعلومات لدى الخدمات الداعمة لـBullBearVote، وقد تُعالج في دول غير دولة إقامتك.",
          "نحتفظ بها للمدة اللازمة للحساب والوظائف وسجلات التوقعات ومعالجة إساءة الاستخدام أو النزاعات والالتزامات القانونية. تختلف المدة بحسب نوع المعلومات والغرض.",
          "قد تنتهي صلاحية البيانات المؤقتة قبل سجلات الحساب. وقد تبقى البيانات المحذوفة في النسخ الاحتياطية حتى استبدالها أو انتهاء صلاحيتها.",
        ],
      },
      {
        title: "حذف الحساب",
        content: [
          "يمكن طلب الحذف عبر بيانات الاتصال أدناه. قد نطلب إثبات ملكية الحساب قبل معالجة الطلب.",
          "سنوضح أثر الحذف على الملف والتعليقات والردود والتوقعات والنقاط، وأي معلومات يجب الاحتفاظ بها وأسباب ذلك.",
          "تسجيل الخروج أو حذف ملفات الارتباط أو فصل Google أو GitHub لا يحذف حساب BullBearVote بحد ذاته.",
        ],
      },
      {
        title: "قواعد المجتمع",
        content: [
          "ناقش باحترام وبما يرتبط بالسوق أو الموضوع. اختلاف الرأي مرحب به، لكن المضايقة والتهديد وخطاب الكراهية والإساءة الموجهة ممنوعة.",
          "لا تنشر رسائل مزعجة أو إعلانات غير مطلوبة أو احتيالًا أو محتوى جنسيًا صريحًا أو معلومات خاصة بالآخرين. لا تنتحل شخصية أحد ولا تشارك محتوى بلا إذن.",
          "لا تتلاعب بالتوقعات أو النقاط أو الإعجابات أو الترتيب باستخدام حسابات متعددة أو الأتمتة أو استغلال أخطاء الموقع.",
          "قد يُقيّد المحتوى المخالف أو يُحذف. وقد تؤدي المخالفات المتكررة أو الجسيمة إلى تقييد الحساب أو تعليقه. يمكنك الإبلاغ عن المحتوى غير المناسب.",
        ],
      },
      {
        title: "شروط الاستخدام",
        content: [
          "يقدم BullBearVote نقاشات السوق ولعبة توقعات افتراضية، ولا يقدم وساطة أو ينفذ صفقات. أنت مسؤول عن نشاط حسابك والمحتوى الذي تقدمه.",
          "تحتفظ بملكية المحتوى. بتقديمه تمنح BullBearVote إذن تخزينه وعرضه ومعالجته حسب الحاجة لتشغيل الخدمة والإشراف عليها.",
          "التوقعات والمنشورات والترتيب ومعلومات السوق ليست مشورة مالية. النقاط بلا قيمة نقدية ولا تُستبدل بالنقود.",
          "قد تحتوي البيانات والنتائج على أخطاء. وقد تُصحح النتائج والنقاط عند اكتشاف أخطاء البيانات أو المعالجة.",
          "قد تتغير الوظائف وقواعد التوقعات، ولا نضمن خدمة دون انقطاع. قد تُحدّث الشروط مع تغيّر الخدمة. لا تحد هذه الشروط من حقوق لا يجوز استبعادها بموجب القانون المعمول به.",
        ],
      },
      {
        title: "الاتصال",
        content: [
          "لاستفسارات الخصوصية وحذف الحساب والوصول إلى البيانات الشخصية أو تصحيحها وملاحظات الإشراف، تواصل عبر {email}.",
          "اذكر اسم المستخدم والتفاصيل الكافية لفهم الطلب. لا ترسل كلمة المرور أو رموز الدخول أو رموز المصادقة مطلقًا.",
        ],
      },
    ],
    disclaimer: [
      {
        title: "الغرض من الموقع",
        content: [
          "BullBearVote مجتمع لمناقشة الأسواق العالمية وتقديم توقعات افتراضية بشأن أداء المؤشرات.",
          "المعلومات للتثقيف العام والنقاش والترفيه، وليست مشورة استثمارية أو توصية بشراء أصول مالية أو بيعها أو الاحتفاظ بها.",
          "أنت مسؤول عن قراراتك المالية. راعِ ظروفك واستعن بمتخصص مؤهل عند الحاجة.",
        ],
      },
      {
        title: "بيانات السوق وتوافرها",
        content: [
          "الأسعار والرسوم وساعات التداول والأخبار وغيرها تأتي من أطراف ثالثة وقد تتأخر أو تكون ناقصة أو غير دقيقة.",
          "قد تؤثر العطلات وتغيّر الجداول وقيود المزوّدين والمشكلات التقنية في حالة السوق والبيانات. قد تعرض الرسوم أحدث جلسة متاحة بدلًا من اليوم الحالي.",
          "لا نضمن الدقة أو الاكتمال أو الحداثة. تحقّق بشكل مستقل قبل اتخاذ قرارات مالية.",
        ],
      },
      {
        title: "التوقعات والنقاط",
        content: [
          "التوقعات جزء من لعبة افتراضية للمؤشرات المدعومة قبل فتح الجلسة المعنية. يُغلق التصويت أثناء فتح السوق.",
          "النقاط درجات افتراضية بلا قيمة نقدية ولا يمكن سحبها أو استبدالها بمال أو أصول مالية.",
          "تعتمد النتائج على قواعد التسوية والبيانات المتاحة. قد تؤخر البيانات المفقودة أو المصححة وإغلاق الأسواق والأخطاء التقنية التسوية أو تستلزم تعديل النتائج والنقاط.",
          "النتائج السابقة والترتيب لا يثبتان خبرة استثمارية ولا يضمنان الأداء المستقبلي.",
        ],
      },
      {
        title: "محتوى المجتمع",
        content: [
          "التعليقات والردود والتوقعات تعبر عن آراء الأفراد، ولا تمثل بالضرورة BullBearVote.",
          "قد تكون غير دقيقة أو مضللة أو تخمينية. الشعبية والإعجابات وترتيب الكاتب ليست دليلًا على موثوقية الادعاءات.",
          "يساعد الإشراف على معالجة المحتوى غير المناسب، لكنه لا يتحقق من كل ادعاء ولا يضمن كشف كل محتوى ضار فورًا. أبلغ عن المخالفات المحتملة.",
        ],
      },
      {
        title: "الروابط الخارجية",
        content: [
          "قد يتضمن الموقع روابط لأخبار ومواقع خارجية للتسهيل والمرجع، ولا تعني تأييدها.",
          "لا نتحكم في محتواها أو توافرها أو أمنها أو خصوصيتها. تنطبق شروطها وسياسات الخصوصية الخاصة بها عند زيارتها.",
        ],
      },
    ],
  },
  hi: {
    help_intro: "पूर्वानुमान, वॉचलिस्ट और खाते की सेटिंग से जुड़े जवाब खोजें।",
    share_feedback: "फ़ीडबैक साझा करें",
    feedback_intro: "कोई सुझाव है या कुछ ठीक से काम नहीं कर रहा? हमें बताएं।",
    feedback_question: "आप क्या साझा करना चाहेंगे?",
    your_feedback: "आपका फ़ीडबैक",
    bug_placeholder: "क्या हुआ और आप क्या होने की उम्मीद कर रहे थे?",
    feedback_placeholder: "आप क्या सुधार देखना चाहेंगे?",
    unavailable: "फ़ीडबैक भेजने की सुविधा अभी उपलब्ध नहीं है।",
    send: "फ़ीडबैक भेजें",
    privacy_intro:
      "जानें कि BullBearVote आपकी जानकारी कैसे संभालता है और समुदाय में कौन से नियम लागू होते हैं।",
    disclaimer_intro:
      "बाज़ार की जानकारी, पूर्वानुमान या समुदाय की सामग्री इस्तेमाल करने से पहले ये सीमाएं पढ़ें।",
    categories: {
      suggestion: "सुझाव",
      bug: "समस्या की रिपोर्ट",
      other: "अन्य",
    },
    help_items: [
      {
        title: "पूर्वानुमान कैसे काम करते हैं?",
        content:
          "अगले कारोबारी सत्र में किसी सूचकांक की दिशा का अनुमान लगाने के लिए Bull या Bear चुनें। बाज़ार खुलने से पहले भाग ले सकते हैं।",
      },
      {
        title: "वोटिंग बंद क्यों है?",
        content:
          "बाज़ार खुला होने पर वोटिंग बंद रहती है। अगली वोटिंग अवधि के लिए बाज़ार की उलटी गिनती देखें।",
      },
      {
        title: "किन बाज़ारों में पूर्वानुमान उपलब्ध हैं?",
        content:
          "पूर्वानुमान सूचकांकों के लिए उपलब्ध हैं। क्रिप्टो, मुद्राओं और कमोडिटी पर टिप्पणियों में चर्चा कर सकते हैं।",
      },
      {
        title: "वॉचलिस्ट कैसे प्रबंधित करूं?",
        content:
          "बाज़ार जोड़ने या हटाने के लिए वॉचलिस्ट प्रबंधन खोलें। अधिकतम 20 बाज़ार जोड़ सकते हैं।",
      },
      {
        title: "क्या भाषा बदल सकता हूं?",
        content: "खाते की सेटिंग में भाषा चुनें। चयन अपने आप सहेजा जाता है।",
      },
    ],
    privacy_terms: [
      {
        title: "हम कौन सी जानकारी लेते हैं",
        content: [
          "Google या GitHub से प्रवेश करने पर हमें ईमेल, उपयोगकर्ता नाम, प्रोफ़ाइल तस्वीर और प्रदाता का खाता पहचानकर्ता जैसी जानकारी मिलती है।",
          "हम चुनी हुई राष्ट्रीयता, भाषा और वॉचलिस्ट तथा टिप्पणियां, जवाब, पूर्वानुमान, अंक इतिहास, लाइक और रिपोर्ट जैसी गतिविधियां सहेजते हैं।",
          "कुकी से लॉगिन सत्र बनाए रखते हैं। थीम जैसी प्राथमिकताओं के लिए स्थानीय संग्रह का इस्तेमाल हो सकता है। अस्थायी कैश पेज और बाज़ार की जानकारी जल्दी लोड करने में मदद करता है।",
        ],
      },
      {
        title: "जानकारी का उपयोग",
        content: [
          "जानकारी का उपयोग खाते और प्राथमिकताओं के प्रबंधन, समुदाय की सुविधाओं, पूर्वानुमान और अंकों के प्रसंस्करण तथा दुरुपयोग रोकने में होता है।",
          "नाम, तस्वीर और सार्वजनिक योगदान अन्य लोगों को दिख सकते हैं। राष्ट्रीयता योगदान या देशवार आंकड़ों में दिख सकती है। ईमेल और प्रमाणीकरण विवरण सार्वजनिक नहीं होते।",
          "प्रमाणीकरण, होस्टिंग और संग्रह के प्रदाता संचालन के लिए आवश्यक जानकारी संसाधित कर सकते हैं। लागू कानून के तहत आवश्यक होने पर जानकारी साझा की जा सकती है।",
        ],
      },
      {
        title: "डेटा संग्रह और रखने की अवधि",
        content: [
          "जानकारी BullBearVote को सहारा देने वाली सेवाओं में रखी जाती है। प्रदाता इसे आपके निवास देश से बाहर संसाधित कर सकते हैं।",
          "खाते और सुविधाओं, पूर्वानुमान रिकॉर्ड, दुरुपयोग या विवादों तथा कानूनी दायित्वों के लिए जितना आवश्यक हो, उतनी अवधि तक रखते हैं। अवधि जानकारी के प्रकार और उद्देश्य पर निर्भर है।",
          "अस्थायी कैश खाते के रिकॉर्ड से पहले समाप्त हो सकता है। हटाई गई जानकारी बैकअप बदलने या समाप्त होने तक बनी रह सकती है।",
        ],
      },
      {
        title: "खाता हटाना",
        content: [
          "नीचे दिए संपर्क से खाता हटाने का अनुरोध कर सकते हैं। पहले खाते का स्वामित्व सत्यापित करने को कह सकते हैं।",
          "हम बताएंगे कि हटाने से प्रोफ़ाइल, टिप्पणियों, जवाबों, पूर्वानुमानों और अंकों पर क्या असर होगा और कौन सी जानकारी क्यों रखनी होगी।",
          "लॉगआउट, कुकी हटाना या Google अथवा GitHub से संबंध तोड़ना अपने आप BullBearVote खाता नहीं हटाता।",
        ],
      },
      {
        title: "समुदाय के नियम",
        content: [
          "सम्मान से और बाज़ार या विषय से संबंधित चर्चा करें। असहमति स्वीकार है, लेकिन उत्पीड़न, धमकी, घृणा भाषण और लक्षित दुर्व्यवहार नहीं।",
          "स्पैम, अनचाहे विज्ञापन, धोखाधड़ी, स्पष्ट यौन सामग्री या किसी की निजी जानकारी न डालें। किसी और का रूप न लें और बिना अनुमति सामग्री साझा न करें।",
          "कई खातों, स्वचालन या साइट की त्रुटियों से पूर्वानुमान, अंक, लाइक या रैंकिंग में हेरफेर न करें।",
          "नियम तोड़ने वाली सामग्री सीमित या हटाई जा सकती है। बार-बार या गंभीर उल्लंघन पर खाता सीमित या निलंबित हो सकता है। अनुचित सामग्री की रिपोर्ट कर सकते हैं।",
        ],
      },
      {
        title: "उपयोग की शर्तें",
        content: [
          "BullBearVote बाज़ार चर्चा और आभासी पूर्वानुमान खेल देता है; ब्रोकरेज सेवा या ट्रेड निष्पादन नहीं। खाते की गतिविधि और भेजी सामग्री की जिम्मेदारी आपकी है।",
          "सामग्री का स्वामित्व आपका रहता है। भेजने पर सेवा चलाने और मॉडरेशन के लिए आवश्यक संग्रह, प्रदर्शन और प्रसंस्करण की अनुमति देते हैं।",
          "पूर्वानुमान, पोस्ट, रैंकिंग और बाज़ार जानकारी वित्तीय सलाह नहीं हैं। अंकों का मौद्रिक मूल्य नहीं और नकद में नहीं बदले जा सकते।",
          "डेटा और परिणाम में त्रुटियां हो सकती हैं। डेटा या प्रसंस्करण त्रुटि मिलने पर परिणाम और अंक सुधारे जा सकते हैं।",
          "सुविधाएं और नियम बदल सकते हैं, और निर्बाध सेवा की गारंटी नहीं है। शर्तें बदल सकती हैं। लागू कानून के तहत न हटाए जा सकने वाले अधिकार सीमित नहीं किए जाते।",
        ],
      },
      {
        title: "संपर्क",
        content: [
          "गोपनीयता, खाता हटाने, निजी जानकारी देखने या सुधारने और मॉडरेशन से जुड़े विषयों के लिए {email} पर संपर्क करें।",
          "उपयोगकर्ता नाम और अनुरोध समझने के लिए पर्याप्त विवरण दें। पासवर्ड, लॉगिन कोड या प्रमाणीकरण टोकन कभी न भेजें।",
        ],
      },
    ],
    disclaimer: [
      {
        title: "वेबसाइट का उद्देश्य",
        content: [
          "BullBearVote वैश्विक बाज़ारों पर चर्चा और सूचकांकों के प्रदर्शन के आभासी पूर्वानुमान का समुदाय है।",
          "जानकारी सामान्य जानकारी, चर्चा और मनोरंजन के लिए है। इसे निवेश सलाह या वित्तीय संपत्ति खरीदने, बेचने या रखने की सिफारिश न मानें।",
          "वित्तीय निर्णयों की जिम्मेदारी आपकी है। अपनी स्थिति देखें और जरूरत हो तो योग्य विशेषज्ञ की सलाह लें।",
        ],
      },
      {
        title: "बाज़ार डेटा और उपलब्धता",
        content: [
          "कीमतें, चार्ट, कारोबारी समय, समाचार और अन्य जानकारी तीसरे पक्ष से आती है और देर से, अधूरी या गलत हो सकती है।",
          "छुट्टियां, समय-सारणी के बदलाव, प्रदाता की सीमाएं और तकनीकी समस्याएं दिखने वाली स्थिति और डेटा को प्रभावित कर सकती हैं। चार्ट आज की जगह अंतिम उपलब्ध सत्र दिखा सकते हैं।",
          "सटीकता, पूर्णता या समयबद्धता की गारंटी नहीं है। वित्तीय निर्णय से पहले स्वतंत्र रूप से जांचें।",
        ],
      },
      {
        title: "पूर्वानुमान और अंक",
        content: [
          "पूर्वानुमान समर्थित सूचकांकों के संबंधित सत्र खुलने से पहले उपलब्ध आभासी खेल का हिस्सा हैं। बाज़ार खुला होने पर वोटिंग बंद रहती है।",
          "अंक साइट के आभासी स्कोर हैं, जिनका मौद्रिक मूल्य नहीं। उन्हें निकालना या पैसे अथवा वित्तीय संपत्ति में बदलना संभव नहीं।",
          "परिणाम निपटान नियमों और उपलब्ध डेटा पर निर्भर हैं। गायब या सुधारा डेटा, बाज़ार बंद होना और तकनीकी त्रुटियां निपटान में देरी या समायोजन का कारण बन सकती हैं।",
          "पिछले परिणाम और रैंकिंग निवेश विशेषज्ञता सिद्ध नहीं करते और भविष्य के प्रदर्शन की गारंटी नहीं देते।",
        ],
      },
      {
        title: "समुदाय की सामग्री",
        content: [
          "टिप्पणियां, जवाब और पूर्वानुमान व्यक्तियों की राय हैं, जरूरी नहीं कि BullBearVote की हों।",
          "वे गलत, भ्रामक या अनुमान आधारित हो सकते हैं। लोकप्रियता, लाइक या लेखक की रैंक दावों की विश्वसनीयता का प्रमाण नहीं हैं।",
          "मॉडरेशन अनुचित सामग्री संभालता है, पर हर दावे की पुष्टि या सभी हानिकारक सामग्री तुरंत पहचानने की गारंटी नहीं देता। संभावित उल्लंघन रिपोर्ट करें।",
        ],
      },
      {
        title: "बाहरी लिंक",
        content: [
          "समाचार और तीसरे पक्ष के लिंक सुविधा और संदर्भ के लिए हैं, उनका समर्थन नहीं दर्शाते।",
          "हम उनकी सामग्री, उपलब्धता, सुरक्षा या गोपनीयता नियंत्रित नहीं करते। वहां जाने पर उनकी अपनी शर्तें और नीतियां लागू होती हैं।",
        ],
      },
    ],
  },
};
