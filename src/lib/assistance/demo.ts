import type {
  AssistanceRequest,
  AssistanceResult,
  Language,
} from "../contracts";

type Translation = { term: string; explanation: string };
type Concept = {
  term: string;
  aliases: string[];
  definition: string;
  context: string;
  translations: Record<Exclude<Language, "en">, Translation>;
};
export const concepts: Concept[] = [
  {
    term: "attention",
    aliases: ["attention", "self-attention", "multi-head attention"],
    definition:
      "A mechanism that gives different weights to relevant parts of an input when forming a representation. It lets a model use information from other positions in a sequence.",
    context:
      "In this paper, attention connects positions in a sequence without processing every token in a recurrent chain. Self-attention relates tokens in the same sequence; multi-head attention learns several such relationships in parallel.",
    translations: {
      hi: {
        term: "अटेंशन (ध्यान तंत्र)",
        explanation:
          "यह तंत्र इनपुट के उपयोगी हिस्सों को अलग-अलग महत्त्व देता है। इस शोधपत्र में शब्द दूसरे शब्दों से जानकारी लेते हैं, बिना उन्हें एक-एक करके संसाधित किए।",
      },
      te: {
        term: "అటెన్షన్ (శ్రద్ధ యంత్రాంగం)",
        explanation:
          "ఇన్‌పుట్‌లో ఉపయోగకరమైన భాగాలకు ఈ యంత్రాంగం వేర్వేరు ప్రాధాన్యతలు ఇస్తుంది. ఈ పత్రంలో ప్రతి పదం ఇతర పదాల నుంచి సమాచారాన్ని తీసుకుంటుంది; పదాలను వరుసగా ప్రాసెస్ చేయాల్సిన అవసరం లేదు.",
      },
      mr: {
        term: "अटेन्शन (लक्ष यंत्रणा)",
        explanation:
          "ही यंत्रणा इनपुटच्या उपयुक्त भागांना वेगवेगळे महत्त्व देते. या शोधनिबंधात शब्द इतर शब्दांकडून माहिती घेतात; प्रत्येक शब्दावर क्रमाने प्रक्रिया करण्याची गरज नसते.",
      },
      ta: {
        term: "அட்டென்ஷன் (கவன இயக்கம்)",
        explanation:
          "உள்ளீட்டின் பயனுள்ள பகுதிகளுக்கு இந்த இயக்கம் வெவ்வேறு முக்கியத்துவம் அளிக்கிறது. இந்த ஆய்வில் சொற்கள் மற்ற சொற்களிலிருந்து தகவலைப் பெறுகின்றன; ஒவ்வொரு சொல்லையும் வரிசையாகச் செயலாக்க வேண்டியதில்லை.",
      },
    },
  },
  {
    term: "transduction",
    aliases: ["transduction", "transducer"],
    definition:
      "Converting an input sequence into an output sequence. For machine translation, the input is a sentence in one language and the output is its translation.",
    context:
      "Sequence transduction here means mapping one sequence to another, often with a different length. The Transformer uses an encoder and a decoder to perform this mapping.",
    translations: {
      hi: {
        term: "अनुक्रम रूपांतरण",
        explanation:
          "एक इनपुट अनुक्रम को आउटपुट अनुक्रम में बदलना। जैसे एक भाषा के वाक्य को दूसरी भाषा में अनुवाद करना। यहाँ Transformer यह काम करता है।",
      },
      te: {
        term: "క్రమ రూపాంతరం",
        explanation:
          "ఒక ఇన్‌పుట్ క్రమాన్ని అవుట్‌పుట్ క్రమంగా మార్చడం. ఉదాహరణకు ఒక భాషలోని వాక్యాన్ని మరో భాషలోకి అనువదించడం. ఇక్కడ Transformer ఈ పని చేస్తుంది.",
      },
      mr: {
        term: "अनुक्रम रूपांतरण",
        explanation:
          "एका इनपुट अनुक्रमाचे आउटपुट अनुक्रमात रूपांतर करणे. उदाहरणार्थ एका भाषेतील वाक्य दुसऱ्या भाषेत अनुवादित करणे. येथे Transformer हे काम करतो.",
      },
      ta: {
        term: "வரிசை மாற்றம்",
        explanation:
          "உள்ளீட்டு வரிசையை வெளியீட்டு வரிசையாக மாற்றுவது. எடுத்துக்காட்டாக ஒரு மொழியிலுள்ள வாக்கியத்தை மற்றொரு மொழியில் மொழிபெயர்ப்பது. இங்கு Transformer இதைச் செய்கிறது.",
      },
    },
  },
  {
    term: "recurrent",
    aliases: ["recurrent", "recurrence", "RNN"],
    definition:
      "Describes a network that processes a sequence step by step, passing a hidden state from one step to the next.",
    context:
      "The paper contrasts recurrent networks with the Transformer. A recurrent chain limits parallel computation across positions; the Transformer replaces that chain with attention, while its decoder still generates outputs autoregressively.",
    translations: {
      hi: {
        term: "पुनरावर्ती",
        explanation:
          "ऐसा नेटवर्क जो अनुक्रम को एक-एक चरण में संसाधित करता है और पिछले चरण की स्थिति आगे भेजता है। Transformer इस पुनरावर्ती शृंखला की जगह अटेंशन का उपयोग करता है।",
      },
      te: {
        term: "పునరావృత నెట్‌వర్క్",
        explanation:
          "క్రమాన్ని ఒక్కో దశగా ప్రాసెస్ చేసి, గత దశ స్థితిని తదుపరి దశకు పంపే నెట్‌వర్క్. Transformer ఈ దశల గొలుసు స్థానంలో అటెన్షన్‌ను ఉపయోగిస్తుంది.",
      },
      mr: {
        term: "पुनरावर्ती",
        explanation:
          "अनुक्रमावर टप्प्याटप्प्याने प्रक्रिया करून मागील टप्प्याची स्थिती पुढे पाठवणारे नेटवर्क. Transformer या साखळीऐवजी अटेन्शन वापरतो.",
      },
      ta: {
        term: "மீள்நிகழ் வலையமைப்பு",
        explanation:
          "ஒரு வரிசையைப் படிப்படியாகச் செயலாக்கி, முந்தைய படியின் நிலையை அடுத்த படிக்கு அனுப்பும் வலையமைப்பு. Transformer இந்தச் சங்கிலிக்குப் பதிலாக அட்டென்ஷனைப் பயன்படுத்துகிறது.",
      },
    },
  },
  {
    term: "Transformer",
    aliases: ["Transformer", "Transformers"],
    definition:
      "The encoder-decoder architecture introduced in this paper. It uses attention and position-wise feed-forward layers, with positional information, rather than recurrent or convolutional sequence layers.",
    context:
      "The original Transformer is a machine translation model. Its attention layers can compare positions directly, making training more parallelizable than recurrent sequence models. The decoder is masked to avoid seeing future output tokens.",
    translations: {
      hi: {
        term: "ट्रांसफॉर्मर",
        explanation:
          "इस शोधपत्र में प्रस्तुत encoder-decoder मॉडल। यह पुनरावर्ती परतों की जगह अटेंशन और feed-forward परतों का उपयोग करता है। शब्दों के क्रम की जानकारी अलग से जोड़ी जाती है।",
      },
      te: {
        term: "ట్రాన్స్‌ఫార్మర్",
        explanation:
          "ఈ పత్రం పరిచయం చేసిన encoder-decoder నమూనా. ఇది పునరావృత పొరల బదులు అటెన్షన్, feed-forward పొరలను ఉపయోగిస్తుంది. పదాల స్థానాల సమాచారం విడిగా జోడించబడుతుంది.",
      },
      mr: {
        term: "ट्रान्सफॉर्मर",
        explanation:
          "या शोधनिबंधात मांडलेले encoder-decoder मॉडेल. ते पुनरावर्ती थरांऐवजी अटेन्शन आणि feed-forward थर वापरते. शब्दांच्या स्थानांची माहिती स्वतंत्रपणे जोडली जाते.",
      },
      ta: {
        term: "டிரான்ஸ்ஃபார்மர்",
        explanation:
          "இந்த ஆய்வு அறிமுகப்படுத்திய encoder-decoder மாதிரி. மீள்நிகழ் அடுக்குகளுக்குப் பதிலாக அட்டென்ஷன், feed-forward அடுக்குகளைப் பயன்படுத்துகிறது. சொற்களின் இடத்தகவல் தனியாகச் சேர்க்கப்படுகிறது.",
      },
    },
  },
  {
    term: "encoder",
    aliases: ["encoder", "encoding"],
    definition:
      "The part of a model that turns the input sequence into representations that the decoder can use.",
    context:
      "The Transformer's encoder combines self-attention and feed-forward layers to represent the source sentence.",
    translations: {
      hi: {
        term: "एन्कोडर",
        explanation:
          "मॉडल का वह भाग जो इनपुट वाक्य को ऐसी संख्यात्मक जानकारी में बदलता है जिसका उपयोग decoder कर सकता है।",
      },
      te: {
        term: "ఎన్‌కోడర్",
        explanation:
          "ఇన్‌పుట్ వాక్యాన్ని decoder ఉపయోగించగల సంఖ్యాత్మక సమాచారంగా మార్చే నమూనా భాగం.",
      },
      mr: {
        term: "एन्कोडर",
        explanation:
          "इनपुट वाक्याचे decoder वापरू शकेल अशा संख्यात्मक माहितीत रूपांतर करणारा मॉडेलचा भाग.",
      },
      ta: {
        term: "என்கோடர்",
        explanation:
          "உள்ளீட்டு வாக்கியத்தை decoder பயன்படுத்தக்கூடிய எண் பிரதிநிதித்துவங்களாக மாற்றும் மாதிரியின் பகுதி.",
      },
    },
  },
  {
    term: "decoder",
    aliases: ["decoder", "decoding"],
    definition:
      "The part of a model that produces the output sequence using encoded input and previously generated output tokens.",
    context:
      "The Transformer decoder uses masked self-attention and attention over the encoder output to generate a translation.",
    translations: {
      hi: {
        term: "डिकोडर",
        explanation:
          "मॉडल का वह भाग जो encoder की जानकारी और पहले बनाए गए शब्दों से आउटपुट अनुक्रम बनाता है।",
      },
      te: {
        term: "డీకోడర్",
        explanation:
          "encoder సమాచారం, ఇప్పటికే ఉత్పత్తి చేసిన పదాలను ఉపయోగించి అవుట్‌పుట్ క్రమాన్ని రూపొందించే భాగం.",
      },
      mr: {
        term: "डिकोडर",
        explanation:
          "encoder ची माहिती आणि आधी तयार केलेले शब्द वापरून आउटपुट अनुक्रम तयार करणारा मॉडेलचा भाग.",
      },
      ta: {
        term: "டிகோடர்",
        explanation:
          "encoder தகவலையும் முன்பு உருவாக்கிய சொற்களையும் கொண்டு வெளியீட்டு வரிசையை உருவாக்கும் பகுதி.",
      },
    },
  },
  {
    term: "convolution",
    aliases: ["convolution", "convolutions", "convolutional"],
    definition:
      "An operation that applies a shared filter to nearby input positions to detect local patterns.",
    context:
      "The paper compares convolutional sequence models with attention. Attention can connect distant positions directly rather than through a stack of local filters.",
    translations: {
      hi: {
        term: "कन्वोल्यूशन",
        explanation:
          "आस-पास के इनपुट स्थानों पर एक ही फ़िल्टर लगाकर स्थानीय पैटर्न पहचानने की क्रिया। अटेंशन दूर के स्थानों को सीधे जोड़ सकता है।",
      },
      te: {
        term: "కన్వల్యూషన్",
        explanation:
          "సమీప ఇన్‌పుట్ స్థానాలకు ఒకే ఫిల్టర్ వర్తింపజేసి స్థానిక నమూనాలను గుర్తించడం. అటెన్షన్ దూర స్థానాలను నేరుగా కలపగలదు.",
      },
      mr: {
        term: "कन्व्होल्युशन",
        explanation:
          "जवळच्या इनपुट स्थानांवर एकच फिल्टर वापरून स्थानिक नमुने ओळखणे. अटेन्शन दूरची स्थाने थेट जोडू शकतो.",
      },
      ta: {
        term: "கன்வல்யூஷன்",
        explanation:
          "அருகிலுள்ள உள்ளீட்டு இடங்களில் ஒரே வடிகட்டியைப் பயன்படுத்தி உள்ளூர் அமைப்புகளை அடையாளம் காண்பது. அட்டென்ஷன் தொலைவிலுள்ள இடங்களை நேரடியாக இணைக்கலாம்.",
      },
    },
  },
];

const genericNative: Record<Exclude<Language, "en">, string> = {
  hi: "इस शब्द का तैयार डेमो अनुवाद उपलब्ध नहीं है। सही अर्थ के लिए अंग्रेज़ी संदर्भ पढ़ें या लाइव AI सेवा जोड़ें।",
  te: "ఈ పదానికి సిద్ధంగా ఉన్న డెమో అనువాదం లేదు. సరైన అర్థం కోసం ఆంగ్ల సందర్భాన్ని చదవండి లేదా లైవ్ AI సేవను జోడించండి.",
  mr: "या शब्दासाठी तयार डेमो भाषांतर उपलब्ध नाही. योग्य अर्थासाठी इंग्रजी संदर्भ वाचा किंवा लाइव्ह AI सेवा जोडा.",
  ta: "இந்தச் சொல்லுக்கு தயாரிக்கப்பட்ட டெமோ மொழிபெயர்ப்பு இல்லை. சரியான பொருளுக்கு ஆங்கிலச் சூழலைப் படிக்கவும் அல்லது நேரடி AI சேவையை இணைக்கவும்.",
};
const easyReplacements = [
  ["dominant", "most common"],
  ["predominant", "most common"],
  ["propose", "introduce"],
  ["novel", "new"],
  ["based solely on", "based only on"],
  ["dispensing with", "without"],
  ["entirely", "fully"],
  ["superior", "better"],
  ["substantially", "much"],
  ["whilst", "while"],
  ["utilizing", "using"],
  ["utilize", "use"],
  ["in order to", "to"],
  ["a significant", "a large"],
  ["demonstrate", "show"],
  ["Furthermore", "Also"],
  ["Additionally", "Also"],
] satisfies [string, string][];

export function matchingConcepts(text: string): Concept[] {
  return concepts.filter((concept) =>
    concept.aliases.some((alias) =>
      new RegExp(`\\b${alias}\\b`, "i").test(text),
    ),
  );
}
export function demoAssistance(request: AssistanceRequest): AssistanceResult {
  const { selection, language, kind, difficulty } = request;
  const found = matchingConcepts(
    kind === "explain" ? selection.quote : selection.paragraph,
  );
  const concept = found[0];
  const attentionPaper = /attention is all you need/i.test(request.paper.title);
  const curated = attentionPaper && concept;
  let english = curated
    ? concept.definition
    : `“${selection.quote}” appears in the supplied passage. This demo has no curated explanation for this term in this paper. Read the surrounding paragraph and edit the context if needed. Connect an AI provider for a contextual definition.`;
  if (kind === "simplify") {
    english = selection.paragraph;
    if (difficulty !== "technical") {
      for (const [from, to] of easyReplacements)
        english = english.replace(new RegExp(`\\b${from}\\b`, "gi"), to);
      if (difficulty === "easy")
        english = english
          .replace(/;\s*/g, ". ")
          .replace(/, which /g, ". This ");
    }
  }
  return {
    english,
    contextualMeaning: curated
      ? concept.context
      : `Context from page ${selection.page}: “${selection.paragraph.slice(0, 500)}${selection.paragraph.length > 500 ? "…" : ""}”`,
    field: curated
      ? "Machine learning · sequence modeling"
      : "Unclassified in demo mode",
    native:
      language === "en"
        ? null
        : {
            language,
            explanation:
              kind === "explain" && curated
                ? concept.translations[language].explanation
                : genericNative[language],
          },
    definitions: attentionPaper
      ? found.flatMap((entry) =>
          entry.aliases
            .filter((alias) =>
              new RegExp(`\\b${alias}\\b`, "i").test(
                kind === "simplify"
                  ? english
                  : selection.paragraph + " " + selection.quote,
              ),
            )
            .map((alias) => ({
              term: alias,
              definition: entry.definition,
              nativeTerm:
                language === "en"
                  ? entry.term
                  : entry.translations[language].term,
            })),
        )
      : [],
    source: "mock",
    note:
      kind === "simplify"
        ? "Demo rewrite uses wording substitutions in your paragraph. Technical terms are preserved. This is not a full AI simplification or translation."
        : curated
          ? "Curated demo explanation for Attention Is All You Need. No AI request was made."
          : "Generic demo fallback. No definition or translation has been invented for this term.",
  };
}
