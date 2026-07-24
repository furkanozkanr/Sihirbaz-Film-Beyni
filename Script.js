/* ==========================================================================
   FILM BEYNİ — script.js
   ÖNEMLİ NOT (dürüstlük payı):
   Bu, sunucusuz/statik bir web uygulamasıdır. Gerçek zamanlı Google araması
   veya canlı "şu an ücretsiz mi" doğrulaması yapabilmek için bir backend +
   API anahtarı (ör. TMDB/JustWatch) gerekir. Onun yerine, her film için
   Google'da güncel ve yasal izleme seçeneklerini aratan gerçek bir buton
   koydum — böylece kırık/yanlış link vermiyorum, kullanıcı anlık durumu
   kendi gözüyle teyit ediyor.
   ========================================================================== */

(function(){
  "use strict";

  /* ---------------- STATE ---------------- */
  const state = {
    jokes: true,
    voice: ("speechSynthesis" in window),
    notif: true,
    animQuality: "ultra",
    favorites: JSON.parse(localStorage.getItem("fb_favorites") || "[]"),
    seenTitles: JSON.parse(localStorage.getItem("fb_seen") || "[]"),
    credits: loadCredits(),
    suggestedCount: parseInt(localStorage.getItem("fb_suggested") || "0", 10),
    watchedCount: parseInt(localStorage.getItem("fb_watched") || "0", 10),
    pendingGenre: null,
    lastResults: []
  };

  const save = () => {
    localStorage.setItem("fb_favorites", JSON.stringify(state.favorites));
    localStorage.setItem("fb_seen", JSON.stringify(state.seenTitles));
    localStorage.setItem("fb_suggested", String(state.suggestedCount));
    localStorage.setItem("fb_watched", String(state.watchedCount));
  };

  /* ---------------- GÜNLÜK 20 HAK SİSTEMİ ----------------
     Her kullanıcıya günde 20 "öneri hakkı" verilir (her tür/dönem seçimi,
     serbest metin önerisi veya rastgele öneri 1 hak düşürür — filmleri
     tek tek saymaz). Gece yarısı otomatik yenilenir. Amaç: cin'in
     sihrinin "sınırlı ve değerli" hissettirmesi, sohbeti gereksiz
     yere şişirmeden odakta tutmak. */
  function todayKey(){
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  }
  function loadCredits(){
    const stored = JSON.parse(localStorage.getItem("fb_credits") || "null");
    if(!stored || stored.date !== todayKey()){
      return { date: todayKey(), remaining: 20 };
    }
    return stored;
  }
  function saveCredits(){
    localStorage.setItem("fb_credits", JSON.stringify(state.credits));
    updateCreditBadge();
  }
  function updateCreditBadge(){
    const badge = $("#creditBadge");
    if(badge){
      badge.textContent = `🎫 ${state.credits.remaining}`;
      badge.classList.toggle("low", state.credits.remaining <= 5);
    }
    const statEl = $("#statCredits");
    if(statEl) statEl.textContent = state.credits.remaining;
  }
  function hasCredit(){
    // gün değiştiyse otomatik yenile
    if(state.credits.date !== todayKey()){
      state.credits = { date: todayKey(), remaining: 20 };
      saveCredits();
    }
    return state.credits.remaining > 0;
  }
  function spendCredit(){
    state.credits.remaining = Math.max(0, state.credits.remaining - 1);
    saveCredits();
  }

  /* ---------------- DATA: GENRES & ERAS (Efendim'in şablonuna sadık) ---------------- */
  const GENRES = [
    {id:"fantastik", label:"Fantastik", emoji:"🌌"},
    {id:"bilimkurgu", label:"Bilim Kurgu", emoji:"🚀"},
    {id:"aksiyon", label:"Aksiyon", emoji:"💥"},
    {id:"dram", label:"Dram", emoji:"🎭"},
    {id:"komedi", label:"Komedi", emoji:"😂"},
    {id:"gerilim", label:"Gerilim", emoji:"🔪"},
    {id:"animasyon", label:"Animasyon", emoji:"🎬"},
    {id:"belgesel", label:"Belgesel", emoji:"🌍"},
    {id:"romantik", label:"Romantik", emoji:"❤️"},
    {id:"tarihi", label:"Tarihi", emoji:"📜"},
    {id:"diger", label:"Diğer", emoji:"🤔"}
  ];

  const ERAS = [
    {id:"e15", label:"15. Yüzyıl", emoji:"🏰"},
    {id:"e16", label:"16. Yüzyıl", emoji:"👑"},
    {id:"e17", label:"17. Yüzyıl", emoji:"⚔️"},
    {id:"e18", label:"18. Yüzyıl", emoji:"🎩"},
    {id:"e19", label:"19. Yüzyıl", emoji:"🚂"},
    {id:"e20", label:"20. Yüzyıl", emoji:"📺"},
    {id:"e21", label:"21. Yüzyıl", emoji:"📱"},
    {id:"gelecek", label:"Gelecek", emoji:"🔮"},
    {id:"belirsiz", label:"Belirsiz", emoji:"🕰️"}
  ];

  const GENRE_COLORS = {
    fantastik:["#5a3fe0","#9b82ff"], bilimkurgu:["#1c3a6e","#3f7bd6"], aksiyon:["#7a1f1f","#d6543f"],
    dram:["#3a2a52","#7c5cff"], komedi:["#8a6a1a","#f2c14e"], gerilim:["#2a2a2a","#5a4a6e"],
    animasyon:["#1f6e5c","#3ecf8e"], belgesel:["#1f4a5c","#3fa0d6"], romantik:["#6e1f4a","#d6437f"],
    tarihi:["#5a4a1f","#c8952b"], diger:["#302a4a","#7c5cff"]
  };

  /* ---------------- DATA: MOVIE LIBRARY ---------------- */
  // Sinopsis ve analizler orijinal, kısa Türkçe özetlerdir. Poster yerine
  // stilize renk kartı kullanılır (gerçek afiş görselleri telifle korunur).
  const MOVIES = [
    {t:"Interstellar", y:2014, dir:"Christopher Nolan", dk:169, imdb:8.6,
     genres:["bilimkurgu","dram"], eras:["gelecek","e21"],
     syn:"Dünya yaşanmaz hale geldiğinde, bir grup bilim insanı insanlığa yeni bir yurt bulmak için zaman ve uzayın ötesine yolculuk eder; aynı zamanda derin bir baba-kız hikâyesi anlatır.",
     guclu:["Duygusal olarak güçlü senaryo","Görsel efekt ve sinematografi","Hans Zimmer'ın unutulmaz müzikleri","Bilimsel gerçeklikle kurgunun dengesi"],
     farkli:["Bilimsel kavramlar (görelilik, kütle-çekim) bazı izleyicilere karmaşık gelebilir","Zaman algısı ve son sahne farklı yorumlanabilir"]},

    {t:"Inception", y:2010, dir:"Christopher Nolan", dk:148, imdb:8.8,
     genres:["bilimkurgu","gerilim","aksiyon"], eras:["e21"],
     syn:"Rüyalara girip fikir çalan bir ekip, bu kez tam tersini yapıp birinin zihnine bir fikir yerleştirme görevini üstlenir; katman katman ilerleyen bir zihin oyunu.",
     guclu:["Özgün ve karmaşık kurgu yapısı","Etkileyici pratik efektler","Zamanla akan gerilim"],
     farkli:["Çok katmanlı zaman akışı ilk izlemede kafa karıştırabilir","Final sahnesi (topaç) izleyiciye göre değişen yorumlara açık"]},

    {t:"Forrest Gump", y:1994, dir:"Robert Zemeckis", dk:142, imdb:8.8,
     genres:["dram","romantik","komedi"], eras:["e20"],
     syn:"Sıra dışı bir zekâya sahip olmayan ama saf bir kalple hayata bakan Forrest'ın, 20. yüzyılın büyük olaylarına tanıklık ettiği ilham verici yolculuğu.",
     guclu:["Sıcak ve içten anlatım","Tarihsel olaylarla harmanlanmış kurgu","Unutulmaz replikler"],
     farkli:["Bazı tarihi olayların basitleştirilmiş sunumu eleştiri konusu olabilir"]},

    {t:"The Shawshank Redemption", y:1994, dir:"Frank Darabont", dk:142, imdb:9.3,
     genres:["dram"], eras:["e20"],
     syn:"Haksız yere hapse düşen bir bankacının, umudunu hiç kaybetmeden hapishane hayatında kurduğu dostluk ve özgürlük arayışının hikâyesi.",
     guclu:["Güçlü karakter gelişimi","Umut temasının ustaca işlenişi","Anlatıcı sesin etkisi"],
     farkli:["Ağır tempolu anlatım bazı izleyiciler için yavaş olabilir"]},

    {t:"The Pursuit of Happyness", y:2006, dir:"Gabriele Muccino", dk:117, imdb:8.0,
     genres:["dram"], eras:["e21"],
     syn:"Evsiz kalan bir baba, küçük oğluyla birlikte tüm zorluklara rağmen daha iyi bir hayat kurmak için mücadele eder; gerçek bir hikâyeden ilham alır.",
     guclu:["İlham verici gerçek hikâye","Baba-oğul ilişkisinin samimi işlenişi","Will Smith'in performansı"],
     farkli:["Duygusal manipülasyon içerdiğini düşünenler olabilir"]},

    {t:"The Lion King", y:1994, dir:"Roger Allers, Rob Minkoff", dk:88, imdb:8.5,
     genres:["animasyon","dram","fantastik"], eras:["belirsiz"],
     syn:"Genç aslan Simba, babasının ölümünün ardından kendi kimliğini ve yerini bulma yolculuğuna çıkar; Afrika savanlarında geçen bir büyüme hikâyesi.",
     guclu:["Zamansız müzikler","Güçlü görsel anlatım","Evrensel büyüme teması"],
     farkli:["Kral Simba'nın 'kader' anlatısı bazılarına fazla klasik gelebilir"]},

    {t:"12 Angry Men", y:1957, dir:"Sidney Lumet", dk:96, imdb:9.0,
     genres:["dram","gerilim"], eras:["e20"],
     syn:"On iki jüri üyesi, tek bir odada bir gencin kaderini tartışırken önyargı, mantık ve vicdan arasında sıkışır.",
     guclu:["Tek mekanda kurulan yoğun gerilim","Diyalog odaklı usta işi senaryo","Karakter analizlerinin derinliği"],
     farkli:["Siyah-beyaz ve yavaş tempo bazı modern izleyicilere ağır gelebilir"]},

    {t:"Spirited Away", y:2001, dir:"Hayao Miyazaki", dk:125, imdb:8.6,
     genres:["animasyon","fantastik"], eras:["belirsiz"],
     syn:"Ailesiyle taşınırken ruhlar dünyasına sürüklenen küçük Chihiro'nun, ailesini kurtarmak için tuhaf bir hamamda çalışmak zorunda kaldığı büyülü hikâye.",
     guclu:["Zengin görsel hayal gücü","Güçlü büyüme ve cesaret teması","Miyazaki'ye özgü el çizimi animasyon"],
     farkli:["Doğrusal olmayan anlatım bazı izleyicilere kapalı gelebilir"]},

    {t:"The Truman Show", y:1998, dir:"Peter Weir", dk:103, imdb:8.2,
     genres:["dram","bilimkurgu","komedi"], eras:["e20"],
     syn:"Tüm hayatının bir TV şovu olduğunu fark etmeyen Truman'ın, gerçeği keşfedip özgürlüğünü arama sürecini anlatan öngörülü bir hikâye.",
     guclu:["Şaşırtıcı derecede güncel kalan teması","Jim Carrey'nin dramatik performansı","Akıllıca kurulmuş metafor"],
     farkli:["Finalin iyimserliği bazı izleyicilere gerçekçi gelmeyebilir"]},

    {t:"Whiplash", y:2014, dir:"Damien Chazelle", dk:106, imdb:8.5,
     genres:["dram"], eras:["e21"],
     syn:"Mükemmelliğe takıntılı genç bir baterist ile onu sınırlarının ötesine iten acımasız bir eğitmenin gerilim dolu ilişkisi.",
     guclu:["Yoğun tempo ve kurgu","Müzik sahnelerinin enerjisi","Karakterler arası güç dinamiği"],
     farkli:["Eğitmenin yöntemleri izleyiciye göre kabul edilebilir ya da rahatsız edici bulunabilir"]},

    {t:"Life of Pi", y:2012, dir:"Ang Lee", dk:127, imdb:7.9,
     genres:["fantastik","dram"], eras:["e20"],
     syn:"Bir gemi kazasından sonra bir kaplanla aynı can filikasında kalan genç Pi'nin, hayatta kalma ve inanç üzerine düşündüren hikâyesi.",
     guclu:["Etkileyici görsel efektler","Felsefi derinlik","Hayatta kalma temasının işlenişi"],
     farkli:["Ana hikâyenin gerçek mi alegori mi olduğu tartışmaya açık bırakılır"]},

    {t:"The Martian", y:2015, dir:"Ridley Scott", dk:144, imdb:8.0,
     genres:["bilimkurgu","dram"], eras:["gelecek","e21"],
     syn:"Mars'ta tek başına mahsur kalan bir astronotun, bilim ve azimle hayatta kalma mücadelesini anlatan umut dolu bir bilim kurgu.",
     guclu:["Bilimsel gerçekçiliğe verilen önem","İyimser ve mizahi ton","Sürükleyici tempo"],
     farkli:["Bazı teknik çözümler basitleştirilmiş bulunabilir"]},

    {t:"Gladiator", y:2000, dir:"Ridley Scott", dk:155, imdb:8.5,
     genres:["tarihi","aksiyon","dram"], eras:["belirsiz"],
     syn:"Ailesi katledilen bir Roma generalinin, gladyatör olarak arenada intikam ve onur arayışı.",
     guclu:["Görkemli sahne tasarımı","Güçlü ana karakter yolculuğu","Etkileyici müzikler"],
     farkli:["Tarihsel doğruluktan bazı noktalarda uzaklaşılmış olması"]},

    {t:"Titanic", y:1997, dir:"James Cameron", dk:195, imdb:7.9,
     genres:["romantik","dram","tarihi"], eras:["e19","e20"],
     syn:"Batmaya mahkum bir geminin güvertesinde, farklı sosyal sınıflardan iki gencin imkânsız aşkının hikâyesi.",
     guclu:["Görsel olarak çığır açan efektler","Duygusal yoğunluk","Dönemin atmosferinin yansıtılışı"],
     farkli:["Uzun süresi ve romantik ton bazı izleyicilere fazla gelebilir"]},

    {t:"The Green Mile", y:1999, dir:"Frank Darabont", dk:189, imdb:8.6,
     genres:["dram","fantastik"], eras:["e20"],
     syn:"Bir hapishane koğuşunda çalışan gardiyanın, olağanüstü bir güce sahip mahkumla tanışmasıyla değişen bakış açısı.",
     guclu:["Duygusal derinlik","Güçlü yan karakterler","Ahlaki sorgulama"],
     farkli:["Uzun süresi ve ağır temposu bazı izleyicilere zorlayıcı gelebilir"]},

    {t:"Coraline", y:2009, dir:"Henry Selick", dk:100, imdb:7.7,
     genres:["animasyon","fantastik"], eras:["e21"],
     syn:"Yeni evinde sıkılan Coraline, duvardaki gizli kapıdan 'diğer' ve tehlikeli bir dünyaya adım atar.",
     guclu:["Stop-motion animasyonun özgünlüğü","Atmosferik görsel tasarım","Cesaret temasının işlenişi"],
     farkli:["Karanlık atmosferi bazı küçük izleyiciler için ürkütücü olabilir"]},

    {t:"Free Solo", y:2018, dir:"Elizabeth Chai Vasarhelyi, Jimmy Chin", dk:100, imdb:8.1,
     genres:["belgesel"], eras:["e21"],
     syn:"Tırmanıcı Alex Honnold'un hiçbir ip veya ekipman kullanmadan El Capitan'ı tırmanma girişimini konu alan nefes kesici belgesel.",
     guclu:["Gerçek gerilim ve risk hissi","Etkileyici görüntüleme teknikleri","İnsan azminin portresi"],
     farkli:["Risk alma davranışının yüceltildiğini düşünenler olabilir"]},

    {t:"The Grand Budapest Hotel", y:2014, dir:"Wes Anderson", dk:99, imdb:8.1,
     genres:["komedi","dram"], eras:["e20"],
     syn:"Efsanevi bir otelin konsiyerjiyle genç yamağının, bir cinayet gizemi ve miras kavgasına karıştığı renkli bir macera.",
     guclu:["Özgün görsel estetik ve simetri","Hızlı ve esprili diyaloglar","Nostaljik anlatım tarzı"],
     farkli:["Wes Anderson'a özgü stilize anlatım herkesin zevkine hitap etmeyebilir"]},

    {t:"Klaus", y:2019, dir:"Sergio Pablos", dk:96, imdb:8.2,
     genres:["animasyon","komedi"], eras:["e19"],
     syn:"Uzak bir kasabaya sürgün edilen bencil bir postacının, gizemli bir marangozla dostluğu sayesinde Noel Baba efsanesinin nasıl doğduğunu anlatan sıcak hikâye.",
     guclu:["Özgün ışıklandırma teknikleri","Sıcak dostluk ve iyilik teması","Akıcı mizah"],
     farkli:["Klasik Noel filmi kalıplarını takip etmesi bazılarına tahmin edilebilir gelebilir"]},

    {t:"Chef", y:2014, dir:"Jon Favreau", dk:114, imdb:7.3,
     genres:["komedi","dram"], eras:["e21"],
     syn:"Kariyerinde tıkanan bir şefin, küçük bir yemek kamyonuyla yeniden tutkusunu ve oğluyla bağını bulma hikâyesi.",
     guclu:["Sıcak baba-oğul ilişkisi","Yemek kültürüne olan sevgi","Keyifli ve rahat tempo"],
     farkli:["Bazı çatışmaların hızlı çözülmesi gerçekçilikten uzaklaşabilir"]},

    {t:"March of the Penguins", y:2005, dir:"Luc Jacquet", dk:80, imdb:7.5,
     genres:["belgesel"], eras:["e21"],
     syn:"Antarktika'nın zorlu koşullarında imparator penguenlerin üreme döngüsünü ve hayatta kalma azmini anlatan görkemli bir doğa belgeseli.",
     guclu:["Etkileyici doğa görüntüleri","Sabırlı ve dingin anlatım","Hayatta kalma temasının vurgusu"],
     farkli:["Yavaş tempo bazı izleyiciler için sabır gerektirebilir"]},

    {t:"Amélie", y:2001, dir:"Jean-Pierre Jeunet", dk:122, imdb:8.3,
     genres:["romantik","komedi"], eras:["e20"],
     syn:"Paris'te yaşayan hayalperest Amélie'nin, çevresindekilerin hayatına gizlice iyilik yaparken kendi aşkını bulma hikâyesi.",
     guclu:["Renkli ve masalsı görsel dil","Sevimli ve özgün karakter","Paris'in büyülü bir şekilde resmedilişi"],
     farkli:["Aşırı stilize anlatım bazı izleyicilere yapmacık gelebilir"]},

    {t:"Paddington 2", y:2017, dir:"Paul King", dk:103, imdb:7.8,
     genres:["komedi","fantastik"], eras:["e21"],
     syn:"Nazik ayı Paddington, sevdiği bir hediyeyi çalınca kendini bir maceranın ve haksız bir suçlamanın içinde bulur.",
     guclu:["Sıcak ve nazik mizah anlayışı","Görsel yaratıcılık","İyimser ve şefkatli ton"],
     farkli:["Bazı izleyiciler için fazla tatlı/naif bulunabilir"]},

    {t:"Hidden Figures", y:2016, dir:"Theodore Melfi", dk:127, imdb:7.8,
     genres:["dram","tarihi","belgesel"], eras:["e20"],
     syn:"NASA'nın uzay yarışında kilit rol oynayan üç Afro-Amerikalı kadın matematikçinin, engellere rağmen başarıya ulaşma hikâyesi.",
     guclu:["İlham verici gerçek olaylar","Güçlü kadın karakterler","Tarihsel bağlamın öğretici sunumu"],
     farkli:["Dramatik unsurların bazı yerlerde yumuşatıldığı düşünülebilir"]},

    {t:"The Princess Bride", y:1987, dir:"Rob Reiner", dk:98, imdb:8.0,
     genres:["fantastik","romantik","komedi"], eras:["belirsiz"],
     syn:"Bir dedenin torununa anlattığı; kaçırılan bir prensesi kurtarmak için devler, kılıç ustaları ve büyücülerle dolu bir diyardan geçen bir aşığın masalı.",
     guclu:["Zamansız mizah anlayışı","Unutulmaz karakterler","Masalsı anlatımın sıcaklığı"],
     farkli:["Eski moda tempo bazı genç izleyicilere yavaş gelebilir"]},

    {t:"Big Fish", y:2003, dir:"Tim Burton", dk:125, imdb:8.0,
     genres:["fantastik","dram"], eras:["e20"],
     syn:"Babasının abartılı hayat hikâyelerinin gerçek payını anlamaya çalışan bir oğulun, gerçekle efsane arasındaki yolculuğu.",
     guclu:["Görsel hayal gücü","Baba-oğul ilişkisinin duygusal işlenişi","Masalsı anlatım tarzı"],
     farkli:["Abartılı anlatım bazı izleyicilere yapmacık gelebilir"]},

    {t:"Stardust", y:2007, dir:"Matthew Vaughn", dk:127, imdb:7.6,
     genres:["fantastik","romantik"], eras:["e19","belirsiz"],
     syn:"Düşen bir yıldızı sevdiğine hediye etmek için büyülü bir diyara giren genç bir adamın, beklenmedik bir aşk ve macera hikâyesi.",
     guclu:["Zengin fantastik evren tasarımı","Mizah ve macerayı dengeleyen anlatım","Sürükleyici yan karakterler"],
     farkli:["Çok sayıda alt hikâye bazı izleyicilere dağınık gelebilir"]},

    {t:"The NeverEnding Story", y:1984, dir:"Wolfgang Petersen", dk:102, imdb:7.4,
     genres:["fantastik"], eras:["belirsiz"],
     syn:"Yalnız bir çocuğun okuduğu büyülü bir kitap aracılığıyla, yok olma tehlikesindeki bir fantastik diyarı kurtarma hikâyesine dahil olması.",
     guclu:["Özgün ve nostaljik görsel tasarım","Hayal gücünün kutlanışı","Duygusal iniş çıkışlar"],
     farkli:["Bazı sahnelerin görsel efektleri günümüz standartlarına göre eskimiş olabilir"]},

    {t:"Edward Scissorhands", y:1990, dir:"Tim Burton", dk:105, imdb:7.9,
     genres:["fantastik","dram","romantik"], eras:["e20"],
     syn:"Elleri makas olarak yaratılmış nazik bir varlığın, sıradan bir mahallede kabul görme ve aşkı bulma çabası.",
     guclu:["Görsel olarak özgün estetik","Farklılık temasının duyarlı işlenişi","Johnny Depp'in sessiz performansı"],
     farkli:["Masalsı-alegorik ton bazı izleyicilere fazla stilize gelebilir"]},

    {t:"Arrival", y:2016, dir:"Denis Villeneuve", dk:116, imdb:7.9,
     genres:["bilimkurgu","dram"], eras:["e21"],
     syn:"Dünya'ya inen gizemli uzaylı gemileriyle iletişim kurmakla görevlendirilen bir dilbilimcinin, zaman algısını değiştiren keşfi.",
     guclu:["Özgün ve zekice kurgu yapısı","Dil ve iletişim temasının derinliği","Atmosferik görsel anlatım"],
     farkli:["Yavaş ve düşünsel tempo aksiyon bekleyenler için beklenmedik olabilir"]},

    {t:"Contact", y:1997, dir:"Robert Zemeckis", dk:150, imdb:7.5,
     genres:["bilimkurgu","dram"], eras:["e20"],
     syn:"Uzaydan gelen bir sinyali çözen bir bilim insanının, bilim ve inanç arasında kalarak çıktığı olağanüstü yolculuk.",
     guclu:["Bilim-inanç geriliminin dengeli işlenişi","Güçlü ana karakter","Felsefi derinlik"],
     farkli:["Final belirsizliği bazı izleyicilere tatmin edici gelmeyebilir"]},

    {t:"WALL-E", y:2008, dir:"Andrew Stanton", dk:98, imdb:8.4,
     genres:["animasyon","bilimkurgu"], eras:["gelecek"],
     syn:"Terk edilmiş bir Dünya'da tek başına çöp toplayan küçük bir robotun, uzayda başlayan beklenmedik aşk ve keşif hikâyesi.",
     guclu:["Neredeyse diyalogsuz güçlü anlatım","Çevre bilinci teması","Duygusal karakter tasarımı"],
     farkli:["Çevresel mesaj bazı izleyicilere doğrudan/didaktik gelebilir"]},

    {t:"Back to the Future", y:1985, dir:"Robert Zemeckis", dk:116, imdb:8.5,
     genres:["bilimkurgu","komedi"], eras:["e20"],
     syn:"Zamanda yolculuk yapan bir arabayla geçmişe giden bir gencin, kendi ailesinin geleceğini tehlikeye atmadan eve dönme telaşı.",
     guclu:["Zekice kurulmuş zaman yolculuğu mantığı","Yüksek enerjili tempo","Nostaljik ve eğlenceli ton"],
     farkli:["Zaman paradoksu mantığı analitik izleyicilerce sorgulanabilir"]},

    {t:"District 9", y:2009, dir:"Neill Blomkamp", dk:112, imdb:7.9,
     genres:["bilimkurgu","aksiyon"], eras:["e21"],
     syn:"Dünya'ya sığınan uzaylıların bir kamp bölgesine hapsedildiği bir dünyada, bir bürokratın dönüşüm geçirdiği çarpıcı hikâye.",
     guclu:["Sosyal alegori olarak güçlü kurgu","Belgesel tarzı özgün anlatım","Yaratıcı görsel efektler"],
     farkli:["Sahnelerdeki şiddet unsuru bazı izleyicilere yoğun gelebilir"]},

    {t:"Ex Machina", y:2014, dir:"Alex Garland", dk:108, imdb:7.7,
     genres:["bilimkurgu","gerilim"], eras:["e21"],
     syn:"Gelişmiş bir yapay zekayı test etmeye davet edilen genç bir programcının, gerçeklik ve manipülasyon arasında sıkıştığı gerilim dolu hikâye.",
     guclu:["Zekice yazılmış diyaloglar","Minimalist ama etkili atmosfer","Yapay zeka etiği üzerine derin sorular"],
     farkli:["Yavaş tempo ve az karakter sayısı bazı izleyicilere sınırlı gelebilir"]},

    {t:"Indiana Jones: Kayıp Hazine Avcıları", y:1981, dir:"Steven Spielberg", dk:115, imdb:8.4,
     genres:["aksiyon","fantastik"], eras:["e20"],
     syn:"Maceraperest bir arkeoloğun, gizemli ve güçlü bir kutsal emaneti Nazilerden önce bulma yarışı.",
     guclu:["Klasik macera tınısı","Sürükleyici tempo","İkonik ana karakter"],
     farkli:["Dönemin bazı kalıpları günümüz gözüyle tartışmaya açık olabilir"]},

    {t:"Star Wars: Bir Umut", y:1977, dir:"George Lucas", dk:121, imdb:8.6,
     genres:["aksiyon","bilimkurgu","fantastik"], eras:["gelecek","belirsiz"],
     syn:"Uzak bir galakside, genç bir çiftçinin kendi kaderini keşfedip zalim bir imparatorluğa karşı direnişe katılma hikâyesi.",
     guclu:["Zamansız iyi-kötü mücadelesi","İkonik evren tasarımı","Kahramanın yolculuğu arketipinin ustaca kullanımı"],
     farkli:["Bazı efektler günümüz standartlarına göre eskimiş olabilir"]},

    {t:"Jurassic Park", y:1993, dir:"Steven Spielberg", dk:127, imdb:8.2,
     genres:["aksiyon","bilimkurgu"], eras:["e20"],
     syn:"Klonlanan dinozorlarla dolu bir adada, bilim ve doğanın sınırlarının nelere mal olabileceğini gösteren gerilim dolu bir macera.",
     guclu:["Çığır açan görsel efektler","Gerilim ve merak dengesi","Bilim etiği üzerine sorular"],
     farkli:["Bilimsel bazı unsurlar basitleştirilmiş bulunabilir"]},

    {t:"Top Gun", y:1986, dir:"Tony Scott", dk:110, imdb:6.9,
     genres:["aksiyon"], eras:["e20"],
     syn:"Genç ve iddialı bir savaş pilotu adayının, elit bir uçuş okulunda kendini ve sınırlarını keşfetme hikâyesi.",
     guclu:["Enerjik uçuş sahneleri","İkonik müzikler","Rekabet temasının işlenişi"],
     farkli:["Karakter derinliği bazı izleyicilere yüzeysel gelebilir"]},

    {t:"Mission: Impossible - Fallout", y:2018, dir:"Christopher McQuarrie", dk:147, imdb:7.7,
     genres:["aksiyon","gerilim"], eras:["e21"],
     syn:"Bir gizli ajanın, dünyayı tehdit eden bir komployu önlemek için giriştiği nefes kesici, yüksek tempolu görev.",
     guclu:["Etkileyici pratik aksiyon sahneleri","Sıkı kurgu temposu","İyi yapılandırılmış gerilim"],
     farkli:["Kurgunun karmaşıklığı bazı izleyicileri takip etmekte zorlayabilir"]},

    {t:"The Bourne Identity", y:2002, dir:"Doug Liman", dk:119, imdb:7.9,
     genres:["aksiyon","gerilim"], eras:["e21"],
     syn:"Hafızasını kaybetmiş eski bir gizli ajanın, kendi kimliğini ve geçmişini çözmeye çalışırken bulduğu tehlikeli gerçekler.",
     guclu:["Gerçekçi ve sade aksiyon tarzı","Merak uyandıran gizem kurgusu","Sürükleyici tempo"],
     farkli:["Devam filmleriyle karşılaştırıldığında daha sade bulunabilir"]},

    {t:"Good Will Hunting", y:1997, dir:"Gus Van Sant", dk:126, imdb:8.3,
     genres:["dram"], eras:["e20"],
     syn:"Olağanüstü bir matematik yeteneğine sahip ama geçmişinin travmalarıyla boğuşan genç bir adamın, bir terapistle iyileşme yolculuğu.",
     guclu:["Güçlü diyaloglar","Terapi sürecinin samimi işlenişi","Unutulmaz performanslar"],
     farkli:["Bazı duygusal dönüm noktaları hızlı çözülmüş bulunabilir"]},

    {t:"A Beautiful Mind", y:2001, dir:"Ron Howard", dk:135, imdb:8.2,
     genres:["dram"], eras:["e20"],
     syn:"Dahi bir matematikçinin, zihinsel sağlık mücadelesiyle birlikte akademik başarıya ulaşma hikâyesi; gerçek bir yaşamdan esinlenir.",
     guclu:["Duyarlı ve saygılı anlatım","Güçlü ana karakter gelişimi","Anlatı yapısındaki şaşırtıcı dönüş"],
     farkli:["Konunun hassasiyeti nedeniyle bazı sahneler ağır gelebilir"]},

    {t:"The Intouchables", y:2011, dir:"Olivier Nakache, Éric Toledano", dk:112, imdb:8.5,
     genres:["dram","komedi"], eras:["e21"],
     syn:"Felç geçirmiş zengin bir adam ile onun bakıcılığını üstlenen banliyö kökenli bir gencin beklenmedik dostluğu.",
     guclu:["Sıcak ve içten dostluk teması","Dram ve mizahın dengesi","Gerçek bir hikâyeden ilham"],
     farkli:["Bazı toplumsal klişeler eleştiri konusu olabilir"]},

    {t:"Dead Poets Society", y:1989, dir:"Peter Weir", dk:128, imdb:8.1,
     genres:["dram"], eras:["e20"],
     syn:"Muhafazakâr bir erkek okulunda, öğrencilerine şiir ve bağımsız düşünmeyi aşılayan sıra dışı bir öğretmenin hikâyesi.",
     guclu:["İlham verici öğretmen-öğrenci ilişkisi","Şiirin gücünün kutlanışı","Duygusal final"],
     farkli:["Final trajedisi bazı izleyicilere ağır gelebilir"]},

    {t:"Rain Man", y:1988, dir:"Barry Levinson", dk:133, imdb:8.0,
     genres:["dram","komedi"], eras:["e20"],
     syn:"Bencil bir adamın, otizmli abisiyle çıktığı yol yolculuğunda empati ve aile bağını yeniden keşfetmesi.",
     guclu:["İki kardeş arasındaki gelişimin samimiyeti","Güçlü performanslar","Empati temasının işlenişi"],
     farkli:["Otizmin tasviri dönemin bilgi seviyesini yansıtır, günümüz standartlarıyla farklı okunabilir"]},

    {t:"Groundhog Day", y:1993, dir:"Harold Ramis", dk:101, imdb:8.0,
     genres:["komedi","fantastik","romantik"], eras:["e20"],
     syn:"Aynı günü sürekli tekrar yaşamaya mahkum kalan alaycı bir hava durumu sunucusunun, kendini yeniden keşfetme hikâyesi.",
     guclu:["Zekice kurulmuş tekrar mantığı","Kişisel gelişim teması","Zamansız mizah"],
     farkli:["Döngünün tam süresi mantıksal olarak net değildir, bu tartışmaya açıktır"]},

    {t:"Some Like It Hot", y:1959, dir:"Billy Wilder", dk:121, imdb:8.2,
     genres:["komedi","romantik"], eras:["e20"],
     syn:"Bir cinayete tanık olan iki müzisyenin, saklanmak için kadın kılığına girip bir kadın orkestrasına katılmasıyla başlayan kaos.",
     guclu:["Zamansız komedi zamanlaması","Zekice yazılmış senaryo","İkonik performanslar"],
     farkli:["Dönemin toplumsal normları günümüz gözüyle farklı değerlendirilebilir"]},

    {t:"Ferris Bueller's Day Off", y:1986, dir:"John Hughes", dk:103, imdb:7.8,
     genres:["komedi"], eras:["e20"],
     syn:"Okulu asıp şehirde unutulmaz bir gün geçirmeye karar veren esprili bir lisenin hikâyesi.",
     guclu:["Enerjik ve keyifli tempo","Gençlik özgürlüğü teması","İkonik sahneler"],
     farkli:["Okul kaçırma davranışının romantize edildiği düşünülebilir"]},

    {t:"Rear Window", y:1954, dir:"Alfred Hitchcock", dk:112, imdb:8.5,
     genres:["gerilim"], eras:["e20"],
     syn:"Bacağı kırılan bir fotoğrafçının, penceresinden komşularını izlerken bir cinayete tanık olduğunu düşünmesiyle başlayan gerilim.",
     guclu:["Ustaca kurulmuş gerilim","Tek mekan kullanımının yaratıcılığı","Hitchcock'un sinematografik ustalığı"],
     farkli:["Ağır tempo modern gerilim filmlerine alışkın izleyicilere yavaş gelebilir"]},

    {t:"The Prestige", y:2006, dir:"Christopher Nolan", dk:130, imdb:8.5,
     genres:["gerilim","dram"], eras:["e19"],
     syn:"Rekabet içindeki iki sihirbazın, birbirlerini geçmek uğruna gittikleri karanlık ve saplantılı yolun hikâyesi.",
     guclu:["Katmanlı ve şaşırtıcı kurgu","Atmosferik dönem detayları","Takıntı temasının derinliği"],
     farkli:["Zaman çizgisinin karmaşıklığı ilk izlemede kafa karıştırabilir"]},

    {t:"Knives Out", y:2019, dir:"Rian Johnson", dk:130, imdb:7.9,
     genres:["gerilim","komedi"], eras:["e21"],
     syn:"Zengin bir yazarın şüpheli ölümünün ardından, alaycı bir dedektifin aile içindeki yalanları çözmeye çalıştığı esprili bir gizem.",
     guclu:["Zekice yazılmış gizem kurgusu","Güçlü ansambl oyunculuk","Sosyal eleştiri ile mizahın dengesi"],
     farkli:["Çok sayıda karakter bazı izleyicileri takip etmekte zorlayabilir"]},

    {t:"The Sixth Sense", y:1999, dir:"M. Night Shyamalan", dk:107, imdb:8.1,
     genres:["gerilim","dram"], eras:["e20"],
     syn:"Ruhlarla konuşabildiğini iddia eden küçük bir çocuğa yardım etmeye çalışan bir çocuk psikoloğunun gizemli hikâyesi.",
     guclu:["Ustaca saklanmış bir final sürprizi","Atmosferik gerilim","Duygusal derinlik"],
     farkli:["İkinci izlemede farklı bir deneyim sunması bazılarına yapay gelebilir"]},

    {t:"Up", y:2009, dir:"Pete Docter", dk:96, imdb:8.3,
     genres:["animasyon","dram","fantastik"], eras:["e21"],
     syn:"Karısını kaybeden yaşlı bir adamın, evini binlerce balonla uçurup hayalindeki maceraya çıkması ve yolda beklenmedik bir dostluk kurması.",
     guclu:["Duygusal açılış sekansının gücü","Kayıp ve yeniden başlama teması","Görsel yaratıcılık"],
     farkli:["Açılış bölümü küçük çocuklar için duygusal olarak yoğun olabilir"]},

    {t:"Inside Out", y:2015, dir:"Pete Docter", dk:95, imdb:8.1,
     genres:["animasyon","komedi","dram"], eras:["e21"],
     syn:"Genç bir kızın zihnindeki duyguların, taşınma sonrası yaşanan değişime uyum sağlamaya çalışmasını konu alan yaratıcı bir hikâye.",
     guclu:["Duyguların yaratıcı görselleştirilişi","Ruh sağlığına duyarlı yaklaşım","Aile için ortak izlenebilirlik"],
     farkli:["Kavramsal soyutlama küçük çocuklar için biraz karmaşık olabilir"]},

    {t:"How to Train Your Dragon", y:2010, dir:"Dean DeBlois, Chris Sanders", dk:98, imdb:8.1,
     genres:["animasyon","fantastik"], eras:["belirsiz"],
     syn:"Vikinglerin ejderhalarla savaştığı bir dünyada, yaralı bir ejderhayla beklenmedik bir dostluk kuran genç bir çocuğun hikâyesi.",
     guclu:["Dostluk ve önyargıyı aşma teması","Etkileyici uçuş sahneleri","Duygusal müzikler"],
     farkli:["Savaş temaları küçük çocuklar için hafif gerilim yaratabilir"]},

    {t:"Ratatouille", y:2007, dir:"Brad Bird", dk:111, imdb:8.1,
     genres:["animasyon","komedi"], eras:["e21"],
     syn:"Şef olmayı hayal eden bir farenin, Paris'in en iyi restoranında gizlice yemek pişirmeye çalışmasını anlatan keyifli hikâye.",
     guclu:["Tutkuyu takip etme teması","Görsel olarak zengin mutfak sahneleri","Beklenmedik dostluklar"],
     farkli:["Bir farenin yemek pişirmesi mantık çerçevesinde sorgulanabilir (ama bu zaten filmin şakası!)"]},

    {t:"My Octopus Teacher", y:2020, dir:"Pippa Ehrlich, James Reed", dk:85, imdb:8.1,
     genres:["belgesel"], eras:["e21"],
     syn:"Bir film yapımcısının, bir ahtapotla kurduğu bir yıl süren beklenmedik bağı konu alan sakinleştirici doğa belgeseli.",
     guclu:["Doğayla kurulan samimi bağın anlatımı","Görsel olarak büyüleyici deniz altı görüntüleri","Sabırlı gözlem teması"],
     farkli:["Yavaş ve tefekkürlü tempo herkese göre olmayabilir"]},

    {t:"Won't You Be My Neighbor?", y:2018, dir:"Morgan Neville", dk:94, imdb:8.4,
     genres:["belgesel"], eras:["e20"],
     syn:"Çocuklara nezaket ve empatiyi öğreten efsanevi TV sunucusu Fred Rogers'ın hayatını ve mirasını anlatan sıcak bir belgesel.",
     guclu:["Nezaket ve empati temasının içtenliği","İlham verici gerçek bir yaşam hikâyesi","Duygusal ama yapmacık olmayan anlatım"],
     farkli:["Bazı izleyiciler için fazla duygusal/sentimental bulunabilir"]},

    {t:"Before Sunrise", y:1995, dir:"Richard Linklater", dk:101, imdb:8.1,
     genres:["romantik","dram"], eras:["e20"],
     syn:"Trende tanışan iki yabancının, Viyana'da geçirdikleri tek bir gecede kurdukları derin ve kırılgan bağın hikâyesi.",
     guclu:["Doğal ve akıcı diyaloglar","Anlık bağlantının samimi işlenişi","Minimalist ama etkili anlatım"],
     farkli:["Diyalog ağırlıklı yapı aksiyon bekleyenler için yavaş olabilir"]},

    {t:"La La Land", y:2016, dir:"Damien Chazelle", dk:128, imdb:8.0,
     genres:["romantik","komedi","dram"], eras:["e21"],
     syn:"Los Angeles'ta hayallerinin peşinden koşan bir müzisyen ile bir oyuncunun aşkı ile kariyer tutkusu arasında yaşadığı gerilim.",
     guclu:["Görsel olarak zengin müzikal sahneler","Tutku ve fedakârlık temasının işlenişi","Nostaljik sinema saygısı"],
     farkli:["Final tercihinin gerçekçiliği izleyiciye göre farklı yorumlanabilir"]},

    {t:"Pride & Prejudice", y:2005, dir:"Joe Wright", dk:129, imdb:7.8,
     genres:["romantik","tarihi","dram"], eras:["e19"],
     syn:"19. yüzyıl İngiltere'sinde, önyargılarını aşarak birbirine aşık olan iki güçlü karakterin hikâyesi.",
     guclu:["Dönem atmosferinin görsel zenginliği","Karakterler arası zekice diyaloglar","Klasik bir romanın sadık uyarlanışı"],
     farkli:["Dönem draması tarzı herkesin zevkine hitap etmeyebilir"]},

    {t:"Braveheart", y:1995, dir:"Mel Gibson", dk:178, imdb:8.3,
     genres:["tarihi","aksiyon","dram"], eras:["belirsiz"],
     syn:"İskoç bir savaşçının, halkını özgürlüğe kavuşturmak için verdiği destansı mücadelenin hikâyesi.",
     guclu:["Destansı ölçekte sahne tasarımı","Özgürlük temasının güçlü işlenişi","Duygusal yoğunluk"],
     farkli:["Tarihsel doğruluktan önemli ölçüde sapmalar içerir"]},

    {t:"The Imitation Game", y:2014, dir:"Morten Tyldum", dk:114, imdb:8.0,
     genres:["tarihi","dram"], eras:["e20"],
     syn:"İkinci Dünya Savaşı sırasında Nazi şifresini kırmaya çalışan dahi bir matematikçinin, hem savaşa hem kendi iç mücadelesine karşı verdiği hikâye.",
     guclu:["Gerçek bir kahramanın hikâyesinin gün yüzüne çıkarılması","Gerilim ve dramanın dengesi","Güçlü ana performans"],
     farkli:["Tarihsel olaylar dramatik etki için bazı yerlerde yeniden düzenlenmiş"]},

    {t:"Lincoln", y:2012, dir:"Steven Spielberg", dk:150, imdb:7.3,
     genres:["tarihi","dram"], eras:["e19"],
     syn:"Başkan Lincoln'ün, köleliği kaldıran anayasa değişikliğini Kongre'den geçirmek için verdiği siyasi ve ahlaki mücadele.",
     guclu:["Titiz tarihsel detay","Güçlü diyalog ağırlıklı senaryo","Etkileyici ana performans"],
     farkli:["Yoğun politik diyaloglar bazı izleyicilere ağır gelebilir"]},

    {t:"1917", y:2019, dir:"Sam Mendes", dk:119, imdb:8.2,
     genres:["tarihi","dram","gerilim"], eras:["e20"],
     syn:"Birinci Dünya Savaşı'nda, binlerce askerin hayatını kurtarmak için tehlikeli bir mesajı zamanında ulaştırmaya çalışan iki askerin yolculuğu.",
     guclu:["Kesintisiz çekim hissi veren yenilikçi sinematografi","Gerçek zamanlı gerilim","Savaşın insani yüzünün yansıtılışı"],
     farkli:["Teknik gösterişin hikâyenin önüne geçtiğini düşünenler olabilir"]},

    {t:"The Sound of Music", y:1965, dir:"Robert Wise", dk:172, imdb:8.0,
     genres:["diger","romantik","tarihi"], eras:["e20"],
     syn:"Bir manastır adayının, yedi çocuklu bir ailenin mürebbiyesi olmasıyla başlayan, müzik ve sevgi dolu bir dönüşüm hikâyesi.",
     guclu:["Unutulmaz müzikaller","Sıcak aile teması","Görkemli dönem atmosferi"],
     farkli:["Uzun süresi ve klasik müzikal tarzı herkese göre olmayabilir"]},

    {t:"The Greatest Showman", y:2017, dir:"Michael Gracey", dk:105, imdb:7.5,
     genres:["diger","dram","tarihi"], eras:["e19"],
     syn:"Sıra dışı yeteneklere sahip insanları bir araya getirerek bir gösteri imparatorluğu kuran hayalperest bir adamın müzikal hikâyesi.",
     guclu:["Enerjik müzikal sahneler","Farklılığı kucaklama teması","Görsel olarak gösterişli sahneleme"],
     farkli:["Gerçek hikâyeden önemli ölçüde uzaklaştığı biliniyor"]}
  ];

  /* ---------------- JOKES (kısa, kibar, esprili) ---------------- */
  const JOKES = [
    "Bir dahi olarak söyleyeyim: senaryo yazmak kolay, iyi senaryo yazmak ise lambanın içinde üç dilek hakkı bulmak kadar zor! 😄",
    "Film önerisi mi? Sihrimi biraz da olsa Netflix algoritmasına borçlu değilim, merak etmeyin! 🧞✨",
    "Popcorn'unuzu hazırlayın Efendim, ben burada tam 20 lamba dolusu öneri hazırlıyorum! 🍿",
    "Bir dilek daha hakkınız olsaydı ne isterdiniz? Ben şimdilik sadece güzel bir film önerisi sunayım. 😉"
  ];

  /* ---------------- DOM HELPERS ---------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function showView(id){
    $$(".view").forEach(v => v.classList.remove("active"));
    const el = document.getElementById(id);
    if(el) el.classList.add("active");
    $$(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.nav === id));
    if(id !== "view-chat") window.scrollTo(0,0);
  }

  function htmlToText(html){
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  let audioUnlocked = false;
  function unlockAudio(){
    if(audioUnlocked || !("speechSynthesis" in window)) return;
    try{
      const warm = new SpeechSynthesisUtterance(" ");
      warm.volume = 0;
      window.speechSynthesis.speak(warm);
      audioUnlocked = true;
    }catch(e){ /* yok sayılır, ilerleyen speak() çağrıları yine de denenir */ }
  }
  // Mobil tarayıcılar sesi ancak bir kullanıcı dokunuşundan sonra açar;
  // bu yüzden sayfadaki İLK dokunuşta sesi sessizce "kilidinden" kurtarıyoruz.
  document.addEventListener("pointerdown", unlockAudio, {once:true});

  function speak(text, onError){
    if(!state.voice || !("speechSynthesis" in window) || !text) return;
    try{
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "tr-TR";
      utter.rate = 1;
      utter.pitch = 1.05;
      utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const trVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith("tr"));
      if(trVoice) utter.voice = trVoice;
      utter.onerror = (ev) => { if(onError) onError(ev.error || "bilinmeyen hata"); };
      window.speechSynthesis.speak(utter);
    }catch(e){
      if(onError) onError(e.message || String(e));
    }
  }

  function timeNow(){
    const d = new Date();
    return d.getHours().toString().padStart(2,"0") + ":" + d.getMinutes().toString().padStart(2,"0");
  }

  function addMsg(html, from, withChips){
    const wrap = document.createElement("div");
    wrap.className = "msg " + from;
    wrap.innerHTML = html + `<span class="time">${timeNow()}</span>`;
    $("#chatScroll").appendChild(wrap);
    if(withChips && withChips.length){
      const row = document.createElement("div");
      row.className = "chips-row";
      withChips.forEach(c => {
        const b = document.createElement("button");
        b.className = "chip";
        b.textContent = c.label;
        b.onclick = c.onClick;
        row.appendChild(b);
      });
      wrap.appendChild(row);
    }
    $("#chatScroll").scrollTop = $("#chatScroll").scrollHeight;
    if(from === "genie" && !html.includes("conjuring")){
      speak(htmlToText(html));
    }
    return wrap;
  }

  function showTyping(cb, delay){
    const t = document.createElement("div");
    t.className = "msg genie typing-dots";
    t.innerHTML = "<span></span><span></span><span></span>";
    $("#chatScroll").appendChild(t);
    $("#chatScroll").scrollTop = $("#chatScroll").scrollHeight;
    setTimeout(() => { t.remove(); cb(); }, delay || 900);
  }

  function maybeJoke(){
    if(!state.jokes) return "";
    if(Math.random() > 0.45) return ""; // her seferinde değil, sohbeti şişirmesin
    const j = JOKES[Math.floor(Math.random()*JOKES.length)];
    return `<br><br><em>${j}</em>`;
  }

  function pick(arr){
    return arr[Math.floor(Math.random()*arr.length)];
  }

  /* ---------------- POSTER (stilize, telif dışı) ---------------- */
  function posterEl(movie, w, h){
    const g = GENRE_COLORS[movie.genres[0]] || ["#302a4a","#7c5cff"];
    const div = document.createElement("div");
    div.className = "poster-mini";
    div.style.background = `linear-gradient(155deg, ${g[0]}, ${g[1]})`;
    if(w) div.style.width = w;
    if(h) div.style.height = h;
    div.textContent = "🎬";
    return div;
  }

  /* ---------------- RECOMMENDATION ENGINE ---------------- */
  function recommend(genreId, eraId, count){
    count = count || 20;
    let pool = MOVIES.slice();
    if(genreId) pool = pool.filter(m => m.genres.includes(genreId));
    if(eraId) pool = pool.filter(m => m.eras.includes(eraId));

    // Yeterli sonuç yoksa kademeli olarak filtreyi gevşet (Efendim'i eli boş göndermeyelim)
    if(pool.length < count && eraId){
      const withoutEra = MOVIES.filter(m => !genreId || m.genres.includes(genreId));
      pool = Array.from(new Set([...pool, ...withoutEra]));
    }
    if(pool.length < count){
      pool = Array.from(new Set([...pool, ...MOVIES]));
    }

    // --- Aynı filmleri tekrar tekrar önermeme mantığı ---
    // Bu filtreye uyan filmlerden daha önce gösterilmemiş olanları önceliklendir.
    const unseen = pool.filter(m => !state.seenTitles.includes(m.t));
    const seen = pool.filter(m => state.seenTitles.includes(m.t));
    let ordered = [...shuffle(unseen), ...shuffle(seen)];

    // Bu filtre için TÜM filmler zaten görülmüşse, o alt küme için hafızayı sıfırla
    // (kısır döngüye girmeyelim, yeni bir tur başlasın) ve tekrar karıştır.
    if(unseen.length === 0 && pool.length){
      state.seenTitles = state.seenTitles.filter(t => !pool.some(m => m.t === t));
      ordered = shuffle(pool);
    }

    const result = ordered.slice(0, count);
    result.forEach(m => { if(!state.seenTitles.includes(m.t)) state.seenTitles.push(m.t); });

    state.lastResults = result;
    state.suggestedCount += result.length;
    save();
    renderStats();
    return result;
  }

  function shuffle(arr){
    return arr.slice().sort(() => Math.random() - 0.5);
  }

  function renderResults(title, list){
    $("#resultsTitle").textContent = title;
    const box = $("#resultsList");
    box.innerHTML = "";
    list.forEach(m => {
      const card = document.createElement("div");
      card.className = "result-card";
      const meta = document.createElement("div");
      meta.className = "result-info";
      meta.innerHTML = `<h4>${m.t} <span style="opacity:.6;font-weight:400">(${m.y})</span></h4>
        <div class="result-meta">
          <span>⭐ ${m.imdb.toFixed(1)}</span>
          <span>${m.dk} dk</span>
          <span class="tag free">Ücretsiz seçenek ara</span>
        </div>`;
      card.appendChild(posterEl(m));
      card.appendChild(meta);
      card.onclick = () => openDetail(m);
      box.appendChild(card);
    });
    showView("view-results");
  }

  /* ---------------- DETAIL VIEW ---------------- */
  let currentDetail = null;
  function openDetail(m){
    currentDetail = m;
    const g = GENRE_COLORS[m.genres[0]] || ["#302a4a","#7c5cff"];
    const genreLabels = m.genres.map(id => GENRES.find(x=>x.id===id)?.label).filter(Boolean).join(", ");
    $("#detailBody").innerHTML = `
      <div class="detail-hero" style="background:linear-gradient(155deg, ${g[0]}, ${g[1]})">
        <h2>${m.t}</h2>
      </div>
      <div class="detail-content">
        <div class="detail-tags">
          <span class="tag res">⭐ ${m.imdb.toFixed(1)} IMDb (yaklaşık)</span>
          <span class="tag free">${m.dk} dk</span>
          <span class="tag res">${m.y}</span>
        </div>
        <div class="detail-section">
          <h4>📖 Konusu</h4>
          <p>${m.syn}</p>
        </div>
        <div class="detail-section">
          <h4>🎬 Tür &amp; Yönetmen</h4>
          <p>${genreLabels} · ${m.dir}</p>
        </div>
        <div class="detail-section">
          <h4>💪 Güçlü Yönleri</h4>
          <ul>${m.guclu.map(x=>`<li>${x}</li>`).join("")}</ul>
        </div>
        <div class="detail-section">
          <h4>🧐 Farklı Yorumlanabilecek Noktalar</h4>
          <ul>${m.farkli.map(x=>`<li>${x}</li>`).join("")}</ul>
        </div>
        <button class="watch-btn" id="watchBtn">🔎 Ücretsiz &amp; Yasal İzleme Seçeneklerini Google'da Bul</button>
        <p class="watch-note">Film Beyni canlı internet erişimine sahip olmadığı için sabit bir link vermek yerine, güncel ve doğrulanmış sonuçlar için sizi doğrudan bir Google aramasına yönlendirir (Tubi, Pluto TV, Internet Archive gibi ücretsiz-yasal platformları önceliklendiren bir sorgu ile).</p>
      </div>`;
    $("#watchBtn").onclick = () => {
      const q = encodeURIComponent(`${m.t} ${m.y} ücretsiz yasal izle site:tubitv.com OR site:pluto.tv OR site:archive.org`);
      window.open(`https://www.google.com/search?q=${q}`, "_blank", "noopener");
      state.watchedCount += 1; save(); renderStats();
    };
    updateFavBtn();
    showView("view-detail");
  }

  function updateFavBtn(){
    const on = currentDetail && state.favorites.some(f => f.t === currentDetail.t);
    $("#detailFavBtn").textContent = on ? "♥" : "♡";
    $("#detailFavBtn").style.color = on ? "#d6437f" : "";
  }

  $("#detailFavBtn").addEventListener("click", () => {
    if(!currentDetail) return;
    const idx = state.favorites.findIndex(f => f.t === currentDetail.t);
    if(idx >= 0) state.favorites.splice(idx,1);
    else state.favorites.push(currentDetail);
    save(); updateFavBtn(); renderFavorites(); renderStats();
  });

  /* ---------------- FAVORITES VIEW ---------------- */
  function renderFavorites(){
    const grid = $("#favGrid");
    grid.innerHTML = "";
    $("#favEmpty").style.display = state.favorites.length ? "none" : "block";
    state.favorites.forEach(m => {
      const item = document.createElement("div");
      item.className = "fav-item";
      item.appendChild(posterEl(m, "100%", "70px"));
      const h5 = document.createElement("h5");
      h5.textContent = m.t;
      item.appendChild(h5);
      item.onclick = () => openDetail(m);
      grid.appendChild(item);
    });
  }

  /* ---------------- PROFILE STATS ---------------- */
  function renderStats(){
    $("#statSuggested").textContent = state.suggestedCount;
    $("#statWatched").textContent = state.watchedCount;
    $("#statFav").textContent = state.favorites.length;
    updateCreditBadge();
  }

  /* ---------------- GENRE / ERA GRIDS ---------------- */
  function buildGenreGrid(){
    const grid = $("#genreGrid");
    grid.innerHTML = "";
    GENRES.forEach(g => {
      const card = document.createElement("div");
      card.className = "card-pick";
      card.innerHTML = `<span class="emoji">${g.emoji}</span><span class="label">${g.label}</span>`;
      card.onclick = () => {
        state.pendingGenre = g.id;
        addMsg(`${g.emoji} <strong>${g.label}</strong> türünü seçtiniz.`, "user");
        showView("view-eras");
      };
      grid.appendChild(card);
    });
  }

  function buildEraList(){
    const list = $("#eraList");
    list.innerHTML = "";
    ERAS.forEach(e => {
      const row = document.createElement("div");
      row.className = "era-row";
      row.innerHTML = `<span class="emoji">${e.emoji}</span><span>${e.label}</span>`;
      row.onclick = () => {
        showView("view-chat");
        runRecommendationFlow(state.pendingGenre, e.id, GENRES.find(x=>x.id===state.pendingGenre)?.label, e.label);
      };
      list.appendChild(row);
    });
  }

  /* ---------------- CONJURING (yükleniyor) ANIMASYONU ---------------- */
  function conjure(cb){
    const holder = addMsg(`<div class="conjuring"><div class="mini-lamp">🪔</div><div class="progress-bar"><div></div></div>Filmleri sihirle hazırlıyorum…</div>`, "genie");
    setTimeout(() => { holder.remove(); cb(); }, state.animQuality === "low" ? 300 : 1200);
  }

  const INTRO_LINES = [
    (l)=>`Anlaşıldı Efendim! <strong>${l}</strong> için sihrimi hazırlıyorum. 🧞‍♂️`,
    (l)=>`<strong>${l}</strong> mi? Nefis bir seçim, hemen bakıyorum. ✨`,
    (l)=>`Lambamı ovuyorum… <strong>${l}</strong> için 20 film geliyor! 🪔`,
    (l)=>`Harika bir zevk Efendim! <strong>${l}</strong> üzerine düşünüyorum. 🌟`
  ];
  const RESULT_LINES = [
    ()=>`İşte 20 özenle seçilmiş film! 📽️`,
    ()=>`Buyurun, tam 20 film hazır! 🎬`,
    ()=>`20 öneri kapıda Efendim! ✨`,
    ()=>`Sihir tamamlandı, 20 film önünüzde! 🔮`
  ];

  function runRecommendationFlow(genreId, eraId, genreLabel, eraLabel){
    const label = [genreLabel, eraLabel].filter(Boolean).join(" · ") || "Karma";
    if(!hasCredit()){
      addMsg(`Bugünkü 20 hakkınızı kullandınız Efendim! Yarın tekrar dolu bir lamba ile buradayım. ✨`, "genie");
      return;
    }
    spendCredit();
    addMsg(pick(INTRO_LINES)(label), "genie");
    conjure(() => {
      const list = recommend(genreId, eraId, 20);
      addMsg(`${pick(RESULT_LINES)()}${maybeJoke()}`, "genie");
      renderResults(label, list);
    });
  }

  /* ---------------- FREE TEXT INPUT (yerel, API gerektirmeyen anlama) ----------------
     Dışarıya bağımlı olmadan, genişletilmiş anahtar kelime + basit dönem
     tanıma ile "akıllı" hissettiren bir anlama katmanı. */
  const GENRE_KEYWORDS = {
    fantastik:["fantastik","büyü","büyülü","masal","ejderha","sihir"],
    bilimkurgu:["bilim kurgu","bilimkurgu","uzay","robot","gelecek","uzaylı","yapay zeka"],
    aksiyon:["aksiyon","kovalamaca","aksiyonlu","dövüş","patlama","macera"],
    dram:["dram","duygusal","içli","ağlatan","hayat hikayesi"],
    komedi:["komedi","güldür","komik","eğlenceli","gülmek"],
    gerilim:["gerilim","gerginlik","gizem","polisiye","dedektif","esrarengiz"],
    animasyon:["animasyon","çizgi film","pixar","disney"],
    belgesel:["belgesel","doğa","gerçek hikaye"],
    romantik:["romantik","aşk","aşık","sevgili"],
    tarihi:["tarih","tarihi","savaş filmi","dönem filmi"],
    diger:["diğer","müzikal","şarkılı"]
  };
  const ERA_KEYWORDS = {
    e15:["15. yüzyıl","onbeşinci yüzyıl"], e16:["16. yüzyıl"], e17:["17. yüzyıl"],
    e18:["18. yüzyıl"], e19:["19. yüzyıl","viktorya"],
    e20:["20. yüzyıl","1980","1990","1970","1960","2. dünya savaşı","ikinci dünya savaşı"],
    e21:["21. yüzyıl","günümüz","modern","şimdiki zaman"],
    gelecek:["gelecek","fütüristik","distopya"],
    belirsiz:["belirsiz","ortaçağ","efsanevi","masalsı zaman"]
  };

  function guessGenre(text){
    text = text.toLowerCase();
    for(const [id, kws] of Object.entries(GENRE_KEYWORDS)){
      if(kws.some(k => text.includes(k))) return id;
    }
    return null;
  }
  function guessEra(text){
    text = text.toLowerCase();
    for(const [id, kws] of Object.entries(ERA_KEYWORDS)){
      if(kws.some(k => text.includes(k))) return id;
    }
    return null;
  }

  function handleUserText(text){
    addMsg(text, "user");
    const genreGuess = guessGenre(text);
    const eraGuess = guessEra(text);
    showTyping(() => {
      if(genreGuess || eraGuess){
        runRecommendationFlow(
          genreGuess, eraGuess,
          genreGuess ? GENRES.find(g=>g.id===genreGuess).label : null,
          eraGuess ? ERAS.find(e=>e.id===eraGuess).label : null
        );
      } else {
        addMsg(`Bir tür ya da dönem söylerseniz hemen 20 film hazırlarım Efendim. 😊`, "genie", [
          {label:"🎬 Film Türleri", onClick:() => { showView("view-genres"); }},
          {label:"⏳ Dönem Seçimi", onClick:() => { showView("view-eras"); }},
          {label:"✨ Rastgele Öner", onClick:() => randomFlow()}
        ]);
      }
    }, 600);
  }

  function randomFlow(){
    if(!hasCredit()){
      addMsg(`Bugünkü 20 hakkınızı kullandınız Efendim! Yarın tekrar dolu bir lamba ile buradayım. ✨`, "genie");
      return;
    }
    spendCredit();
    addMsg("Rastgele sihir yapıyorum! 🔮", "genie");
    conjure(() => {
      const list = recommend(null, null, 20);
      addMsg(`İşte fal taşı gibi açık, karma 20 film! 🎲${maybeJoke()}`, "genie");
      renderResults("Rastgele Öneriler", list);
    });
  }

  /* ---------------- INIT CHAT ---------------- */
  function initialGreeting(){
    addMsg(
      `Merhaba Efendim! 🧞‍♂️🧞‍♀️ Ben sizin özel oluşturduğunuz bir 🎬 Film Beyni'yim! 🧠<br>` +
      `Size nasıl yardımcı olabilirim, nasılsınız?<br><br>` +
      `Bana bir tür, dönem söyleyin ya da aşağıdaki kısayolları kullanın — hemen yüksek kaliteli, ilham verici 20 film önerisi hazırlayayım! ✨`,
      "genie"
    );
  }

  /* ---------------- EVENTS ---------------- */
  $("#composerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#composerInput");
    const val = input.value.trim();
    if(!val) return;
    input.value = "";
    handleUserText(val);
  });

  $$(".quick-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const action = chip.dataset.action;
      if(action === "genres") showView("view-genres");
      if(action === "eras") showView("view-eras");
      if(action === "random") randomFlow();
    });
  });

  /* ---------------- MIKROFON (sesli komut) ---------------- */
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = $("#micBtn");
  let recognition = null;
  if(SpeechRecognitionCtor){
    recognition = new SpeechRecognitionCtor();
    recognition.lang = "tr-TR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      micBtn.classList.remove("listening");
      handleUserText(text);
    };
    recognition.onerror = () => micBtn.classList.remove("listening");
    recognition.onend = () => micBtn.classList.remove("listening");
    micBtn.addEventListener("click", () => {
      if(micBtn.classList.contains("listening")) { recognition.stop(); return; }
      try{
        window.speechSynthesis && window.speechSynthesis.cancel();
        recognition.start();
        micBtn.classList.add("listening");
      }catch(e){ micBtn.classList.remove("listening"); }
    });
  } else {
    micBtn.disabled = true;
    micBtn.title = "Bu tarayıcı sesli komutu desteklemiyor (Chrome/Android önerilir)";
  }

  $$(".back-btn").forEach(btn => {
    btn.addEventListener("click", () => showView(btn.dataset.back));
  });

  $$(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      showView(item.dataset.nav);
      if(item.dataset.focusComposer) setTimeout(() => $("#composerInput").focus(), 200);
      if(item.dataset.nav === "view-favorites") renderFavorites();
      if(item.dataset.nav === "view-profile") renderStats();
    });
  });

  $("#menuBtn").addEventListener("click", () => { showView("view-profile"); renderStats(); });
  $("#settingsShortcut").addEventListener("click", () => showView("view-settings"));
  $("#gotoSettings").addEventListener("click", () => showView("view-settings"));

  /* ---------------- SETTINGS ---------------- */
  if(!("speechSynthesis" in window)){
    state.voice = false;
    $("#toggleVoice").classList.remove("on");
    $("#toggleVoice").classList.add("disabled-toggle");
    $("#voiceSupportNote").textContent = "Bu tarayıcı sesli okumayı desteklemiyor (Chrome/Safari güncel sürüm önerilir).";
  }
  $("#toggleVoice").addEventListener("click", function(){
    if(!("speechSynthesis" in window)) return;
    state.voice = !state.voice;
    this.classList.toggle("on", state.voice);
    if(state.voice) speak("Cin sesi açık Efendim.");
    else window.speechSynthesis.cancel();
  });
  $("#testVoiceBtn").addEventListener("click", function(){
    unlockAudio();
    if(!("speechSynthesis" in window)){
      $("#voiceSupportNote").textContent = "Bu tarayıcı sesli okumayı hiç desteklemiyor.";
      return;
    }
    if(!state.voice){
      state.voice = true;
      $("#toggleVoice").classList.add("on");
    }
    const voiceCount = window.speechSynthesis.getVoices().length;
    speak("Merhaba Efendim, ben Film Beyni! Sesimi duyabiliyor musunuz?", (err) => {
      $("#voiceSupportNote").textContent = `Ses çalınamadı (${err}). Cihazınızda sistem sesinin açık olduğundan ve tarayıcının güncel olduğundan emin olun.`;
    });
    if(voiceCount === 0){
      $("#voiceSupportNote").textContent = "Cihazınızda henüz yüklü bir okuma sesi bulunamadı — birkaç saniye sonra tekrar deneyin, bazı tarayıcılar sesleri geç yükler.";
    } else {
      $("#voiceSupportNote").textContent = "";
    }
  });
  $("#toggleJokes").addEventListener("click", function(){
    state.jokes = !state.jokes;
    this.classList.toggle("on", state.jokes);
  });
  $("#toggleNotif").addEventListener("click", function(){
    state.notif = !state.notif;
    this.classList.toggle("on", state.notif);
  });

  $$("#segAnim button").forEach(btn => {
    btn.addEventListener("click", function(){
      $$("#segAnim button").forEach(b=>b.classList.remove("active"));
      this.classList.add("active");
      state.animQuality = this.dataset.val;
      document.body.classList.toggle("anim-low", state.animQuality === "low");
    });
  });

  /* ---------------- SPLASH -> APP ---------------- */
  function goToApp(){
    $("#splash").classList.add("leaving");
    setTimeout(() => {
      $("#splash").classList.remove("active");
      $("#app").classList.add("visible");
      initialGreeting();
    }, 550);
  }
  $("#splash").addEventListener("click", goToApp);
  setTimeout(goToApp, 2600);

  /* ---------------- BOOT ---------------- */
  buildGenreGrid();
  buildEraList();
  renderStats();
  renderFavorites();
  updateCreditBadge();
  // Önceki Gemini denemesinden kalan anahtarları temizle (artık kullanılmıyor)
  localStorage.removeItem("fb_gemini_key");
  localStorage.removeItem("fb_gemini_on");

  /* ---------------- PWA: service worker kaydı ----------------
     Telefonda "Ana ekrana ekle" dediğinizde gerçek logonun ve
     "yüklenebilir uygulama" davranışının çalışması için gerekli. */
  if("serviceWorker" in navigator){
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

})();

