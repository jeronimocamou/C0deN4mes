-- Replace the default (English) word pack with a large, full-alphabet list so
-- shuffled boards feel varied instead of clustering on early-alphabet words.
-- Run in the Supabase SQL editor. Safe to re-run.
--
-- Targets the pack by is_default = true (which always exists), so it works
-- whether or not the Spanish-pack migration has been applied.

do $$
declare
  col_type text;
  updated  int;
  en text[] := array[
    'africa','agent','air','alien','amazon','ambulance','america','angel','apple','arm',
    'atlantis','australia','aztec','back','ball','band','bank','bar','bark','bat',
    'battery','beach','bear','bed','bell','belt','berlin','berry','bill','block',
    'board','bolt','bomb','bond','boom','boot','bottle','bow','box','bridge',
    'brush','buck','buffalo','bug','bugle','button','calf','cap','capital','car',
    'card','carrot','casino','cast','cat','cell','center','chair','change','charge',
    'check','chest','chick','china','chocolate','church','circle','cliff','cloak','club',
    'code','cold','comic','compound','concert','conductor','contract','cook','copper','cotton',
    'court','cover','crane','crash','cricket','cross','crown','cycle','dance','date',
    'day','death','deck','degree','diamond','dice','dinosaur','disease','doctor','dog',
    'draft','dragon','dress','drill','drop','duck','dwarf','eagle','egypt','embassy',
    'engine','england','europe','eye','face','fair','fall','fan','fence','field',
    'fighter','figure','file','film','fire','fish','flute','fly','foot','force',
    'forest','fork','france','game','gas','genius','germany','ghost','giant','glass',
    'glove','gold','grace','grass','greece','green','ground','ham','hand','hawk',
    'head','heart','hole','honey','hood','hook','horn','horse','hospital','hotel',
    'ice','india','iron','ivory','jack','jam','jet','jupiter','kangaroo','ketchup',
    'key','kid','king','kiwi','knife','knight','lab','lap','laser','lawyer',
    'lead','lemon','life','light','line','link','lion','litter','lock','log',
    'london','luck','mail','mammoth','maple','marble','march','mass','match','mercury',
    'mexico','microscope','mine','mint','missile','model','mole','moon','moscow','mount',
    'mouse','mouth','mug','nail','needle','net','night','ninja','note','novel',
    'nurse','nut','octopus','oil','olive','opera','orange','organ','palm','pan',
    'pants','paper','parachute','park','part','pass','paste','penguin','phoenix','piano',
    'pie','pilot','pin','pipe','pirate','pistol','pit','pitch','plane','plastic',
    'plate','play','plot','point','poison','pole','police','pool','port','post',
    'pound','press','princess','pumpkin','pupil','pyramid','queen','rabbit','racket','ray',
    'ring','robin','robot','rock','rome','root','rose','roulette','round','row',
    'ruler','satellite','saturn','scale','school','scientist','scorpion','screen','seal','server',
    'shadow','shark','ship','shoe','shop','shot','sink','slip','slug','snow',
    'snowman','sock','soldier','soul','sound','space','spell','spider','spike','spine',
    'spot','spring','spy','square','stadium','staff','star','state','stick','stock',
    'straw','stream','strike','string','sub','suit','swing','switch','table','tablet',
    'tag','tail','tap','teacher','telescope','temple','theater','thief','thumb','tick',
    'tie','time','tokyo','tooth','torch','tower','track','train','triangle','trip',
    'trunk','tube','turkey','unicorn','vacuum','van','vet','wake','wall','war',
    'washer','watch','water','wave','web','well','whale','whip','wind','witch',
    'worm','yard','zebra','zombie','zoo'
  ];
begin
  select data_type into col_type
    from information_schema.columns
   where table_name = 'word_packs' and column_name = 'words';

  if col_type = 'ARRAY' then
    update word_packs set words = en where is_default = true;
    get diagnostics updated = row_count;
    if updated = 0 then insert into word_packs (is_default, words) values (true, en); end if;
  else
    update word_packs set words = to_jsonb(en) where is_default = true;
    get diagnostics updated = row_count;
    if updated = 0 then insert into word_packs (is_default, words) values (true, to_jsonb(en)); end if;
  end if;
end $$;
