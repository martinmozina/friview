##Odprte zadeve:

* Shranjevanje modela vedno pod imenom "model.json", bi se to dalo spremeniti na ime po izbiri
* ???Weights??? labela na utežeh noda za popravit
* slider kot komponenta je dokaj težek za točno določanje uteži, možnost vpisa vrednosti?
* zakaj se spreminjajo uteži če jih spremenim v nekem drugem vozlišču
* pri variantah (surove vrednosti) naj bodo vse številke z enakim decimalnim ločilom: če je vrednost variante A 50.23, naj bo v primeru vrednosti variante B 50 => 50.00 
* MAP: potrebno narediti relativno skalo saj ne bo vedno razpon vrednosti 0 do 100



14.11.2016:
	Večje spremembe:
	
	- Popravljene uteži. Imena lastnosti v modelu:
		- userWeight -> utež, ki jo določi uporabnik
		- levelNormalizedWeight -> normalizirana utež na nivoju posamezne globine (voslišča). To je prvi korak izračuna uteži
		- finalNormalizedWeight -> končne normalizirane uteži primerne za nadaljno analizo. (Vsota vseh finalNormalizedWeight kriterijev je enaka 1)
	- Diskretnim kriterijem se lahko dodaja kategorije z presledki
	- tooltipi na gumbih krožnega menija
	- popravki bug-ov pri macbeth-u.