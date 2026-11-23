// Lista inicial: 60 palabras A1 que se guardan una sola vez, la primera vez que
// se abre la app. Después son palabras del usuario (se pueden editar y borrar).
// needsReview: true = REVISAR (traducción que depende del país o del momento).

const w = (id, category, gender, fr, es, exampleFr, exampleEs, needsReview = false) => ({
  id: `seed-${id}`, fr, es, exampleFr, exampleEs, category, gender, needsReview,
});

export const INITIAL_WORDS = [
  // Saludos
  w('bonjour', 'Saludos', null, 'bonjour', 'hola, buenos días', 'Bonjour, madame !', '¡Buenos días, señora!'),
  w('bonsoir', 'Saludos', null, 'bonsoir', 'buenas tardes, buenas noches', 'Bonsoir, tout le monde.', 'Buenas noches a todos.', true),
  w('salut', 'Saludos', null, 'salut', 'hola (informal)', 'Salut, Paul, ça va ?', 'Hola, Paul, ¿qué tal?'),
  w('au-revoir', 'Saludos', null, 'au revoir', 'adiós', 'Au revoir et à demain !', '¡Adiós y hasta mañana!'),
  w('merci', 'Saludos', null, 'merci', 'gracias', 'Merci pour le café.', 'Gracias por el café.'),
  w('sil-vous-plait', 'Saludos', null, "s'il vous plaît", 'por favor (formal)', "Un café, s'il vous plaît.", 'Un café, por favor.'),
  w('excusez-moi', 'Saludos', null, 'excusez-moi', 'disculpe', 'Excusez-moi, où est la gare ?', 'Disculpe, ¿dónde está la estación?'),
  w('a-bientot', 'Saludos', null, 'à bientôt', 'hasta pronto', 'Merci et à bientôt !', '¡Gracias y hasta pronto!'),
  w('ca-va', 'Saludos', null, 'ça va ?', '¿qué tal?', 'Bonjour, Marie, ça va ?', 'Hola, Marie, ¿qué tal?'),
  w('bonne-nuit', 'Saludos', null, 'bonne nuit', 'buenas noches (al irse a dormir)', 'Bonne nuit, à demain.', 'Buenas noches, hasta mañana.'),

  // Familia
  w('pere', 'Familia', 'm', 'le père', 'el padre', 'Mon père est professeur.', 'Mi padre es profesor.'),
  w('mere', 'Familia', 'f', 'la mère', 'la madre', 'Ma mère habite à Lyon.', 'Mi madre vive en Lyon.'),
  w('frere', 'Familia', 'm', 'le frère', 'el hermano', "J'ai un frère.", 'Tengo un hermano.'),
  w('soeur', 'Familia', 'f', 'la sœur', 'la hermana', 'Ma sœur a dix ans.', 'Mi hermana tiene diez años.'),
  w('fils', 'Familia', 'm', 'le fils', 'el hijo', "Leur fils s'appelle Hugo.", 'Su hijo se llama Hugo.'),
  w('fille', 'Familia', 'f', 'la fille', 'la hija, la chica', 'Leur fille est petite.', 'Su hija es pequeña.'),
  w('parents', 'Familia', 'm', 'les parents', 'los padres', 'Mes parents sont gentils.', 'Mis padres son amables.'),
  w('grand-pere', 'Familia', 'm', 'le grand-père', 'el abuelo', 'Mon grand-père a quatre-vingts ans.', 'Mi abuelo tiene ochenta años.'),
  w('grand-mere', 'Familia', 'f', 'la grand-mère', 'la abuela', 'Ma grand-mère fait un gâteau.', 'Mi abuela hace un pastel.'),
  w('mari', 'Familia', 'm', 'le mari', 'el marido', 'Son mari est espagnol.', 'Su marido es español.'),

  // Casa
  w('maison', 'Casa', 'f', 'la maison', 'la casa', 'La maison est grande.', 'La casa es grande.'),
  w('chambre', 'Casa', 'f', 'la chambre', 'el dormitorio, la habitación', 'Ma chambre est petite.', 'Mi habitación es pequeña.', true),
  w('cuisine', 'Casa', 'f', 'la cuisine', 'la cocina', 'Le pain est dans la cuisine.', 'El pan está en la cocina.'),
  w('salle-de-bains', 'Casa', 'f', 'la salle de bains', 'el baño', 'La salle de bains est à gauche.', 'El baño está a la izquierda.'),
  w('porte', 'Casa', 'f', 'la porte', 'la puerta', "Ferme la porte, s'il te plaît.", 'Cierra la puerta, por favor.'),
  w('fenetre', 'Casa', 'f', 'la fenêtre', 'la ventana', "Ouvre la fenêtre, s'il te plaît.", 'Abre la ventana, por favor.'),
  w('lit', 'Casa', 'm', 'le lit', 'la cama', 'Le chat dort sur le lit.', 'El gato duerme en la cama.'),
  w('table', 'Casa', 'f', 'la table', 'la mesa', 'Les clés sont sur la table.', 'Las llaves están en la mesa.'),
  w('chaise', 'Casa', 'f', 'la chaise', 'la silla', 'Il y a une chaise dans le salon.', 'Hay una silla en el salón.'),
  w('salon', 'Casa', 'm', 'le salon', 'el salón, la sala de estar', 'Nous regardons la télé dans le salon.', 'Vemos la tele en el salón.'),

  // Comida
  w('pain', 'Comida', 'm', 'le pain', 'el pan', 'Je mange du pain le matin.', 'Como pan por la mañana.'),
  w('eau', 'Comida', 'f', "l'eau", 'el agua', "Je bois de l'eau.", 'Bebo agua.'),
  w('cafe', 'Comida', 'm', 'le café', 'el café', 'Le café est chaud.', 'El café está caliente.'),
  w('lait', 'Comida', 'm', 'le lait', 'la leche', 'Le lait est dans le frigo.', 'La leche está en la nevera.', true),
  w('pomme', 'Comida', 'f', 'la pomme', 'la manzana', 'Je mange une pomme.', 'Me como una manzana.'),
  w('fromage', 'Comida', 'm', 'le fromage', 'el queso', "J'aime le fromage français.", 'Me gusta el queso francés.'),
  w('viande', 'Comida', 'f', 'la viande', 'la carne', 'Il ne mange pas de viande.', 'Él no come carne.'),
  w('poisson', 'Comida', 'm', 'le poisson', 'el pescado, el pez', 'Le poisson est frais.', 'El pescado está fresco.'),
  w('vin', 'Comida', 'm', 'le vin', 'el vino', 'Je bois un verre de vin rouge.', 'Bebo una copa de vino tinto.'),
  w('oeuf', 'Comida', 'm', "l'œuf", 'el huevo', 'Je mange un œuf au petit déjeuner.', 'Como un huevo en el desayuno.'),

  // Tiempo
  w('jour', 'Tiempo', 'm', 'le jour', 'el día', 'Les jours sont longs en été.', 'Los días son largos en verano.'),
  w('semaine', 'Tiempo', 'f', 'la semaine', 'la semana', 'Je travaille cinq jours par semaine.', 'Trabajo cinco días a la semana.'),
  w('mois', 'Tiempo', 'm', 'le mois', 'el mes', 'Le mois de mai est très beau.', 'El mes de mayo es muy bonito.'),
  w('annee', 'Tiempo', 'f', "l'année", 'el año', 'Bonne année !', '¡Feliz año!'),
  w('aujourdhui', 'Tiempo', null, "aujourd'hui", 'hoy', "Aujourd'hui, il fait beau.", 'Hoy hace buen tiempo.'),
  w('demain', 'Tiempo', null, 'demain', 'mañana', 'À demain !', '¡Hasta mañana!'),
  w('hier', 'Tiempo', null, 'hier', 'ayer', "Hier, j'ai vu Marie.", 'Ayer vi a Marie.'),
  w('matin', 'Tiempo', 'm', 'le matin', 'la mañana', 'Je bois un café le matin.', 'Tomo un café por la mañana.'),
  w('soir', 'Tiempo', 'm', 'le soir', 'la tarde, la noche', 'Le soir, je lis un livre.', 'Por la noche, leo un libro.', true),
  w('maintenant', 'Tiempo', null, 'maintenant', 'ahora', 'Je suis occupé maintenant.', 'Ahora estoy ocupado.'),

  // Verbos
  w('etre', 'Verbos', null, 'être', 'ser, estar', 'Je suis étudiant.', 'Soy estudiante.'),
  w('avoir', 'Verbos', null, 'avoir', 'tener', "J'ai deux frères.", 'Tengo dos hermanos.'),
  w('aller', 'Verbos', null, 'aller', 'ir', 'Je vais au marché.', 'Voy al mercado.'),
  w('faire', 'Verbos', null, 'faire', 'hacer', "Qu'est-ce que tu fais ?", '¿Qué haces?'),
  w('parler', 'Verbos', null, 'parler', 'hablar', 'Je parle un peu français.', 'Hablo un poco de francés.'),
  w('manger', 'Verbos', null, 'manger', 'comer', 'Nous mangeons à midi.', 'Comemos a mediodía.'),
  w('boire', 'Verbos', null, 'boire', 'beber', 'Tu bois du thé ?', '¿Bebes té?'),
  w('aimer', 'Verbos', null, 'aimer', 'gustar, amar', "J'aime la musique.", 'Me gusta la música.'),
  w('habiter', 'Verbos', null, 'habiter', 'vivir (en un lugar)', "J'habite à Madrid.", 'Vivo en Madrid.'),
  w('vouloir', 'Verbos', null, 'vouloir', 'querer', 'Je veux un café.', 'Quiero un café.'),
];
