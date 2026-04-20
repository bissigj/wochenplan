export const SUPA_URL = 'https://qbodqcxhmlkqvmdxstrn.supabase.co';
export const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFib2RxY3hobWxrcXZtZHhzdHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODM3NTIsImV4cCI6MjA5MTY1OTc1Mn0.Xh5vyf0A2fieS5weyho-kHBwL5Red64L40D2axTEBNY';

export const DAYS = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
// Default settings – used only on first load if no settings in DB
export const DEFAULT_SETTINGS = {
  cats: [
    { id: 'cat_pasta',       label: 'pasta',      color: '#8a6830', bg: '#f5f0e8' },
    { id: 'cat_curry',       label: 'curry',      color: '#8a4028', bg: '#faeee8' },
    { id: 'cat_suppe',       label: 'suppe',      color: '#68829E', bg: '#e8f0f5' },
    { id: 'cat_salat',       label: 'salat',      color: '#598234', bg: '#eef3e0' },
    { id: 'cat_auflauf',     label: 'auflauf',    color: '#534AB7', bg: '#eeecf8' },
    { id: 'cat_fruehstueck', label: 'frühstück',  color: '#7a4a8a', bg: '#f5eef8' },
    { id: 'cat_sonstiges',   label: 'sonstiges',  color: '#68686a', bg: '#f0f0ee' },
  ],
  aufwand: [
    { id: 'auf_einfach', label: 'einfach', color: '#598234', bg: '#eef5e8' },
    { id: 'auf_mittel',  label: 'mittel',  color: '#6a7a20', bg: '#f0f4e0' },
    { id: 'auf_schwer',  label: 'schwer',  color: '#8a3838', bg: '#f5eeee' },
  ]
};
export const DEFAULT_EINHEITEN = ['Stück','g','kg','dl','cl','ml','l','EL','TL','Prise','Bund','Dose','Pck.'];

export const DEFAULTS = [
  {id:1,name:'Spaghetti Pomodoro',cat:'pasta',auf:'einfach',time:25,portions:2,
   ings:[{m:500,u:'g',n:'Spaghetti'},{m:2,u:'Dose',n:'Tomaten'},{m:3,u:'Stück',n:'Knoblauch'},{m:1,u:'Bund',n:'Basilikum'},{m:3,u:'EL',n:'Olivenöl'}],
   steps:['Spaghetti nach Packung kochen.','Knoblauch in Olivenöl anschwitzen.','Tomaten dazugeben, 15 min köcheln.','Mit Basilikum servieren.'],src:{type:'url',val:'https://www.chefkoch.de',seite:''}},
  {id:2,name:'Kürbissuppe',cat:'suppe',auf:'einfach',time:40,portions:4,
   ings:[{m:1,u:'Stück',n:'Hokkaido Kürbis'},{m:400,u:'ml',n:'Kokosmilch'},{m:30,u:'g',n:'Ingwer'},{m:2,u:'Stück',n:'Zwiebeln'},{m:1,u:'l',n:'Gemüsebrühe'}],
   steps:['Kürbis würfeln, Zwiebeln und Ingwer anschwitzen.','Kürbis mit Brühe 20 min köcheln.','Kokosmilch hinzufügen, pürieren.'],src:{type:'buch',val:'Ottolenghi Simple',seite:'42'}},
  {id:3,name:'Kichererbsen-Curry',cat:'curry',auf:'mittel',time:35,portions:4,
   ings:[{m:2,u:'Dose',n:'Kichererbsen'},{m:1,u:'Dose',n:'Tomaten'},{m:400,u:'ml',n:'Kokosmilch'},{m:2,u:'EL',n:'Currypaste'},{m:200,u:'g',n:'Spinat'}],
   steps:['Currypaste anbraten.','Kichererbsen und Tomaten dazugeben.','Kokosmilch einrühren, 15 min köcheln.','Spinat unterheben.'],src:null},
  {id:4,name:'Zucchini-Frittata',cat:'auflauf',auf:'mittel',time:30,portions:4,
   ings:[{m:2,u:'Stück',n:'Zucchini'},{m:6,u:'Stück',n:'Eier'},{m:150,u:'g',n:'Feta'},{m:2,u:'Stück',n:'Knoblauch'},{m:2,u:'EL',n:'Olivenöl'}],
   steps:['Zucchini anbraten.','Eier verquirlen, Feta zerbröckeln.','Beides über Zucchini giessen.','Unter Grill 3 min bräunen.'],src:{type:'buch',val:'Plenty',seite:'118'}},
  {id:5,name:'Rote Linsensuppe',cat:'suppe',auf:'einfach',time:30,portions:4,
   ings:[{m:300,u:'g',n:'Rote Linsen'},{m:2,u:'Stück',n:'Karotten'},{m:2,u:'Stück',n:'Zwiebeln'},{m:1,u:'TL',n:'Kreuzkümmel'},{m:1,u:'Stück',n:'Zitrone'}],
   steps:['Zwiebeln und Karotten anschwitzen.','Linsen mit Brühe 30 min köcheln.','Mit Kreuzkümmel und Zitrone abschmecken.'],src:null},
  {id:6,name:'Pesto-Gnocchi',cat:'pasta',auf:'einfach',time:15,portions:2,
   ings:[{m:500,u:'g',n:'Gnocchi'},{m:150,u:'g',n:'Pesto'},{m:200,u:'g',n:'Kirschtomaten'},{m:50,u:'g',n:'Parmesan'}],
   steps:['Gnocchi kochen.','Tomaten kurz anbraten.','Mit Pesto vermengen, Parmesan darüber.'],src:null},
  {id:7,name:'Buddha Bowl',cat:'salat',auf:'mittel',time:35,portions:2,
   ings:[{m:200,u:'g',n:'Quinoa'},{m:1,u:'Dose',n:'Kichererbsen'},{m:1,u:'Stück',n:'Avocado'},{m:2,u:'Stück',n:'Karotten'},{m:3,u:'EL',n:'Tahini'}],
   steps:['Quinoa kochen.','Kichererbsen rösten.','Alles anrichten, Tahini-Dressing darüber.'],src:null},
  {id:8,name:'Shakshuka',cat:'frühstück',auf:'einfach',time:25,portions:2,
   ings:[{m:4,u:'Stück',n:'Eier'},{m:2,u:'Dose',n:'Tomaten'},{m:2,u:'Stück',n:'Paprika'},{m:1,u:'Stück',n:'Zwiebeln'},{m:1,u:'EL',n:'Harissa'}],
   steps:['Zwiebeln und Paprika anschwitzen.','Tomaten und Harissa 10 min köcheln.','Eier einlegen, 5 min pochieren.'],src:null},
  {id:9,name:'Süsskartoffel-Dal',cat:'curry',auf:'mittel',time:40,portions:4,
   ings:[{m:600,u:'g',n:'Süsskartoffeln'},{m:200,u:'g',n:'Rote Linsen'},{m:1,u:'Dose',n:'Tomaten'},{m:200,u:'ml',n:'Kokosmilch'},{m:2,u:'TL',n:'Garam Masala'}],
   steps:['Süsskartoffeln würfeln.','Mit Linsen und Tomaten aufsetzen.','Garam Masala und Kokosmilch einrühren, 25 min köcheln.'],src:{type:'buch',val:'BOSH!',seite:'76'}},
  {id:10,name:'Rote-Beete-Risotto',cat:'auflauf',auf:'schwer',time:55,portions:4,
   ings:[{m:300,u:'g',n:'Risottoreis'},{m:3,u:'Stück',n:'Rote Beete'},{m:1,u:'l',n:'Gemüsebrühe'},{m:1,u:'Stück',n:'Zwiebeln'},{m:80,u:'g',n:'Parmesan'}],
   steps:['Rote Beete kochen und pürieren.','Reis in Brühe unter Rühren kochen.','Rote-Beete-Püree einrühren, mit Parmesan vollenden.'],src:{type:'buch',val:'Plenty More',seite:'204'}},
  {id:11,name:'Griechischer Salat',cat:'salat',auf:'einfach',time:15,portions:2,
   ings:[{m:4,u:'Stück',n:'Tomaten'},{m:1,u:'Stück',n:'Gurke'},{m:200,u:'g',n:'Feta'},{m:100,u:'g',n:'Oliven'},{m:3,u:'EL',n:'Olivenöl'}],
   steps:['Tomaten und Gurke schneiden.','Feta und Oliven dazugeben.','Mit Olivenöl und Oregano anmachen.'],src:null},
  {id:12,name:'Pasta e Fagioli',cat:'pasta',auf:'mittel',time:40,portions:4,
   ings:[{m:300,u:'g',n:'Kleine Pasta'},{m:2,u:'Dose',n:'Cannellini Bohnen'},{m:1,u:'Dose',n:'Tomaten'},{m:1,u:'Stück',n:'Rosmarin'},{m:3,u:'Stück',n:'Knoblauch'}],
   steps:['Knoblauch und Rosmarin anschwitzen.','Bohnen und Tomaten 15 min köcheln.','Hälfte Bohnen pürieren, Pasta darin kochen.'],src:null},
  {id:13,name:'Lauch-Käse-Quiche',cat:'auflauf',auf:'schwer',time:70,portions:6,
   ings:[{m:1,u:'Pck.',n:'Blätterteig'},{m:2,u:'Stück',n:'Lauch'},{m:3,u:'Stück',n:'Eier'},{m:200,u:'ml',n:'Sahne'},{m:150,u:'g',n:'Gruyère'}],
   steps:['Teig blind backen 10 min.','Lauch anschwitzen.','Eier-Sahne-Käse-Guss über Lauch, 35 min backen.'],src:null},
  {id:14,name:'Mango-Erdnuss-Curry',cat:'curry',auf:'mittel',time:35,portions:4,
   ings:[{m:400,u:'g',n:'Tofu'},{m:1,u:'Stück',n:'Mango'},{m:400,u:'ml',n:'Kokosmilch'},{m:3,u:'EL',n:'Erdnussbutter'},{m:200,u:'g',n:'Reisnudeln'}],
   steps:['Tofu knusprig braten.','Mango mitbraten.','Kokosmilch und Erdnussbutter einrühren, 10 min köcheln.','Mit Reisnudeln servieren.'],src:null},
];
