# Construir frases: lecciones 1 a 3

**Estado: Pendiente de revisión del usuario.** Nada de este contenido está validado todavía por el usuario.

Este documento muestra, elemento por elemento, el contenido de `data/lessons/fr/fr-a1-01.json`, `fr-a1-02.json` y `fr-a1-03.json`. Una prueba automática (`tests/lessons-content.test.js`) comprueba que cada tabla coincide con su archivo: el `id`, el texto francés y la marca REVISAR.

**Cómo leer las tablas**
- **id:** `i` idea, `t` cómo pensarlo, `e` ejemplo, `p` trampa, `x` ejercicio, `s` situación.
- **Francés:** el texto francés principal. En la idea va «—» porque la idea está en español. En la trampa va la forma correcta. En un ejercicio va la primera respuesta aceptada (en «Completar», lo que se escribe en el hueco). En la situación va el primer modelo.
- **Fuente:** dónde se confirmó la regla, con la página del documento (no la del PDF) o el artículo en línea.
- **REVISAR:** «sí» cuando el elemento debe mostrarse con la marca REVISAR. El motivo va debajo de cada tabla.

## Fuentes

1. **Inventaire linguistique des contenus clés des niveaux du CECRL** (Eaquals y CIEP, 2015). En las tablas, «Inventaire».
   - Dirección: https://www.eaquals.org/wp-content/uploads/Inventaire_ONLINE_full.pdf
   - Anexo D, págs. 49-52: tabla de gramática por nivel. El nivel se marca con color, así que se miró cada página como imagen. Celda oscura = contenido clave (más consenso); celda clara = menos consenso.
   - Anexo E, pág. 56: lista de contenidos clave de A1.
   - Anexo F, págs. 62-67: frases de ejemplo de A1.
2. **Niveau A2 pour le français. Un référentiel**, capítulo 5 «Grammaire» (Beacco y Porquier, Didier, 2008). En las tablas, «Niveau A2».
   - Dirección: https://bop.fipf.org/wp-content/uploads/2017/03/refa343342.pdf (extracto publicado por la FIPF).
   - Se leyeron las págs. 101-115. Las que se citan son 103 y 106-110 (pág. 106: verbos; pág. 107: lista de determinantes; pág. 108: *c'est*, *il y a*, construcciones verbales y determinantes; pág. 109: pronombres; pág. 110: imperativo).
3. **Banque de dépannage linguistique** (Office québécois de la langue française), https://vitrinelinguistique.oqlf.gouv.qc.ca/. En las tablas, «BDL». Artículos leídos el 25/11/2026:
   - «Cas où l'élision est obligatoire»: https://vitrinelinguistique.oqlf.gouv.qc.ca/index.php?id=21737
   - «C'EST et CE SONT : accord et emploi»: https://vitrinelinguistique.oqlf.gouv.qc.ca/index.php?id=21603
   - «DE : emploi dans une phrase négative»: https://vitrinelinguistique.oqlf.gouv.qc.ca/23514/la-grammaire/les-determinants/determinants-indefinis/de-dans-une-phrase-negative
   - «DU et DÛ : distinguer ces homophones»: https://vitrinelinguistique.oqlf.gouv.qc.ca/21501/la-grammaire/les-homophones-grammaticaux/les-homophones-du-et-du
   - «Les déterminants : mode d'emploi»: https://vitrinelinguistique.oqlf.gouv.qc.ca/24332/la-grammaire/la-grammaire-actuelle/les-classes-de-mots-et-les-groupes/les-determinants
   - En el mismo sitio, pero en el **Grand dictionnaire terminologique** (otra obra de la misma oficina), la ficha «déterminant contracté»: https://vitrinelinguistique.oqlf.gouv.qc.ca/fiche-gdt/fiche/26506951/determinant-contracte. No se encontró un artículo de la BDL dedicado a *au, aux, du, des*. En las tablas, «OQLF, GDT».

**No se pudo leer** el *Niveau A1 pour le français* (Didier, 2007): nada de este documento se apoya en él.

## Qué se comprobó y qué no

- **El nivel de cada tema** se comprobó en el Inventaire (anexos D y E) y en el Niveau A2. Todo lo de las lecciones 1 a 3 es A1 clave en el Inventaire, salvo los partitivos (ver abajo) y la elisión, que el Inventaire no trata como tema de gramática (se confirmó en la BDL).
- **Las formas y las reglas** se comprobaron con las frases de ejemplo del Inventaire (anexo F), las estructuras del Niveau A2 y los artículos de la BDL.
- **Partitivos (*du, de la, de l'*):** marcados REVISAR. El Inventaire los pone en A1 (pág. 51, celda oscura) como expresión de cantidad, y en A2 con menos consenso; el Niveau A2 los pone en A2 (pág. 108) y dice que la investigación no permite saber si son A1 o A2 (pág. 103).
- **Contrastes con el español** («en español no se pone nada», «el café es el que gusta»): las fuentes no comparan con el español (el Niveau A2, pág. 103, nota 2, dice que no puede hacerlo). La parte francesa de cada contraste sí está confirmada.
- **Que el sujeto sea obligatorio** no está escrito con esas palabras en ninguna fuente. Se apoya en las estructuras del Niveau A2 (todas las frases que cuentan algo empiezan por el sujeto, pág. 108) y en que una frase sin sujeto es un imperativo (pág. 110).

## Lección 1 · La frase básica (fr-a1-01)

Nivel A1. Áreas: sintaxis, gramática, ortografía.

Bloques del patrón (sin fuente propia; se apoyan en las ideas):

- **Para destacar (opcional):** `Moi,` `Toi,` `Lui,` `Elle,`
- **Sujeto:** `je` `j'` `tu` `il` `elle` `nous` `vous` `ils` `elles`
- **Verbo:** `parle` `aime` `habite` `travaille`
- **Complemento:** `français` `le café` `à Santiago` `avec moi`

| id | Tipo | Francés | Español o explicación | Fuente | REVISAR |
|---|---|---|---|---|---|
| i1 | Idea | — | En francés, la frase se arma con bloques en un orden fijo: primero quién hace algo (el sujeto: je, tu, il, elle, nous, vous, ils, elles), después la acción (el verbo) y al final el resto (el complemento: qué, dónde, con quién). En español puedes decir «hablo francés» sin «yo». En francés, cuando cuentas algo, el sujeto va delante del verbo: Je parle français. Sin sujeto, «Parle français» es una orden («¡Habla francés!»). Ojo con je: delante de una vocal o de una h muda (la de habiter) pierde la e y se une a la palabra siguiente con un apóstrofo, sin espacio: j'aime, j'habite, j'ai. | Niveau A2 §5.2.3.1 p. 108 (GN V GN) y §5.2.8 p. 110 (imperativo); Inventaire F pp. 62-64 (j'habite, j'aime, j'ai); BDL «élision obligatoire» |  |
| i2 | Idea | — | Para destacar a una persona («yo, en cambio…»), el francés suma un pronombre tónico, que es la forma fuerte del pronombre: moi, toi, lui, elle, nous, vous, eux, elles. No reemplaza al sujeto: va antes, con una coma, y el sujeto sigue en su lugar: Moi, je parle français. El tónico también va solo o después de palabras como et, avec y chez: et toi ? (¿y tú?), avec moi (conmigo), chez moi (en mi casa), c'est moi (soy yo). | Inventaire D p. 52 (pronombres sujeto y tónicos, A1 clave); Inventaire F p. 62 (et toi ?, chez moi), p. 64 (avec moi), p. 65 (Moi, j'aime le jazz; C'est à moi); Niveau A2 §5.2.4.5 p. 109; BDL «C'EST et CE SONT» (eux, elles, nous, vous) |  |
| t1 | Cómo pensarlo | Je parle français. | «Hablo francés.» → En español el verbo basta. En francés el bloque es sujeto + verbo: je parle. | Niveau A2 §5.2.3.1 p. 108 |  |
| t2 | Cómo pensarlo | J'aime le café. | «Me gusta el café.» → En español el café es el que «gusta». En francés tú eres el sujeto: j'aime + lo que te gusta. | Inventaire F p. 62 (J'aime les fruits), p. 65; BDL «élision obligatoire» |  |
| t3 | Cómo pensarlo | Moi, je parle français, et toi ? | «Yo hablo francés, ¿y tú?» → Para destacar «yo», no cambias je por moi: agregas moi delante y dejas je. Después de et va toi, no tu. | Inventaire F p. 62 (et toi ?), p. 65 (Moi, je suis italienne); Niveau A2 p. 109 (Pro, Pro V) |  |
| e1 | Ejemplo | Je parle français. | Hablo francés. | Niveau A2 p. 108; Inventaire F p. 64 (parler français) |  |
| e2 | Ejemplo | Moi, j'aime le café. | A mí me gusta el café. | Inventaire F p. 65 (Moi, j'aime le jazz) |  |
| e3 | Ejemplo | Elle habite à Lyon. | Ella vive en Lyon. | Inventaire F p. 64 (Ils habitent à Toronto), p. 65 (J'habite à Ottawa) |  |
| e4 | Ejemplo | Tu viens avec moi ? | ¿Vienes conmigo? | Inventaire F p. 64 (Tu viens avec moi ?) |  |
| e5 | Ejemplo | J'habite à Santiago, et toi ? | Vivo en Santiago, ¿y tú? | Inventaire F p. 62; BDL «élision obligatoire» |  |
| p1 | Trampa | Je parle français. | Error: «Parle français.» → Sin je, la frase es una orden («¡Habla francés!»). Para contar lo que haces, pon el sujeto delante del verbo. | Niveau A2 p. 108 y p. 110 |  |
| p2 | Trampa | J'aime le café. | Error: «Je aime le café.» → Delante de vocal, je pierde la e y se une con apóstrofo: j'aime. | BDL «élision obligatoire» |  |
| p3 | Trampa | Moi, je parle français. | Error: «Moi parle français.» → Moi no reemplaza a je. Si quieres destacar, usa los dos: Moi, je… | Inventaire F p. 65; Niveau A2 p. 109 |  |
| x1 | Ordenar | Je parle français. | Ordena las palabras: «Hablo francés». Fichas: «français» «Je» «parle» Regla: Primero el sujeto (je), después el verbo (parle) y al final el complemento (français). | Niveau A2 p. 108 |  |
| x2 | Ordenar | Elle habite à Lyon. | Ordena las palabras: «Ella vive en Lyon». Fichas: «à» «habite» «Lyon» «Elle» Regla: Sujeto + verbo + dónde: Elle + habite + à Lyon. | Niveau A2 p. 108; Inventaire F pp. 64-65 |  |
| x3 | Ordenar | Moi, je travaille à Santiago, et toi ? | Ordena las palabras: «Yo trabajo en Santiago, ¿y tú?», destacando el «yo». Fichas: «toi» «travaille» «Moi» «à» «je» «Santiago» «et» Regla: El tónico moi va delante y je sigue en su lugar: Moi, je travaille… Después de et va toi. | Inventaire F pp. 62, 65; Niveau A2 p. 109 |  |
| x4 | Completar | J'habite | Completa con je + habite: «Vivo en Santiago». Hueco: «___ à Santiago.» Errores previstos: «Je habite» → Habite empieza con h muda, que se comporta como una vocal: je pierde la e y se une con apóstrofo, j'habite. «J habite» → Falta el apóstrofo: j'habite, todo junto. Regla: Delante de vocal o de h muda, je se vuelve j': j'habite. | BDL «élision obligatoire»; Inventaire F p. 62 |  |
| x5 | Completar | toi | Completa: «Vivo en Santiago, ¿y tú?». Hueco: «J'habite à Santiago, et ___ ?» Errores previstos: «tu» → Tu solo va delante de un verbo (tu habites). Después de et, sin verbo, va el tónico: et toi ? Regla: Después de et, sin verbo, va el pronombre tónico: et toi ? | Inventaire F p. 62 |  |
| x6 | Completar | moi | Completa: «¿Vienes conmigo?». Hueco: «Tu viens avec ___ ?» Errores previstos: «je» → Je solo va delante de un verbo. Después de avec va el tónico: avec moi (conmigo). «mi» → En francés no hay «mí». Después de avec se dice moi: avec moi. «mí» → En francés no hay «mí». Después de avec se dice moi: avec moi. Regla: Después de avec, chez o et va el pronombre tónico: avec moi. | Inventaire F pp. 62, 64; Niveau A2 p. 109 (Prép Pro) |  |
| x7 | Corregir | Je parle espagnol et français. | Corrige la frase. Quieres decir «Hablo español y francés». Frase con error: «Parle espagnol et français.» También se acepta: «Moi, je parle espagnol et français.» «Je parle l'espagnol et le français.» «Moi, je parle l'espagnol et le français.» Errores previstos: «Parle espagnol et français.» → Sin sujeto es una orden («¡Habla español y francés!»). Pon je delante: Je parle… «Moi parle espagnol et français.» → Moi no reemplaza a je. Pon je delante del verbo: Je parle… Regla: Cuando cuentas algo, el sujeto va delante del verbo: Je parle… | Niveau A2 pp. 108, 110 |  |
| x8 | Corregir | J'aime le chocolat. | Corrige la frase: «Me gusta el chocolate». Frase con error: «Je aime le chocolat.» También se acepta: «Moi, j'aime le chocolat.» Errores previstos: «Je aime le chocolat.» → Aime empieza con vocal: je pierde la e y se une con apóstrofo, j'aime. «J aime le chocolat.» → Falta el apóstrofo: j'aime, todo junto. Regla: Delante de vocal, je se vuelve j': j'aime. | BDL «élision obligatoire»; Inventaire F pp. 64, 66 (le chocolat) |  |
| x9 | Corregir | Moi, j'habite à Lyon, et toi ? | Corrige la frase: «Yo vivo en Lyon, ¿y tú?». Frase con error: «Moi, j'habite à Lyon, et tu ?» También se acepta: «J'habite à Lyon, et toi ?» Errores previstos: «Moi, j'habite à Lyon, et tu ?» → Después de et, sin verbo, no va tu sino el tónico: et toi ? Regla: Después de et, sin verbo, va el pronombre tónico: et toi ? | Inventaire F p. 62 |  |
| s1 | Situación | J'habite à Santiago et je parle espagnol, et toi ? | Conoces a alguien en un café de París. Dile dónde vives y qué idioma hablas, y pregúntale lo mismo con «et toi ?». Patrón: Sujeto + verbo + complemento, j' delante de vocal y el tónico en «et toi ?». Otros modelos: «Moi, j'habite à Santiago, et toi ?» «Je parle espagnol et français, et toi ?» | Inventaire F p. 62; Niveau A2 p. 108; BDL «élision obligatoire» |  |

Nada marcado REVISAR en esta lección.

## Lección 2 · Être, avoir, c'est, il y a (fr-a1-02)

Nivel A1. Áreas: gramática, sintaxis.

Bloques del patrón (sin fuente propia; se apoyan en las ideas):

- **Sujeto + être:** `je suis` `tu es` `il / elle est` `nous sommes` `vous êtes` `ils / elles sont`
- **Sujeto + avoir:** `j'ai` `tu as` `il / elle a` `nous avons` `vous avez` `ils / elles ont`
- **Presentar:** `C'est…` `Ce sont…` `Il y a…`
- **Preguntar:** `Qui est-ce ?` `Qu'est-ce que c'est ?`

| id | Tipo | Francés | Español o explicación | Fuente | REVISAR |
|---|---|---|---|---|---|
| i1 | Idea | — | Être (ser y estar) y avoir (tener) son dos verbos que usarás todo el tiempo. Sus formas son irregulares, así que se aprenden de memoria y en bloque con el sujeto: je suis, tu es, il / elle est, nous sommes, vous êtes, ils / elles sont; j'ai, tu as, il / elle a, nous avons, vous avez, ils / elles ont. Ser y estar son el mismo verbo en francés: Je suis de Santiago (soy de Santiago) y Je suis à la maison (estoy en la casa). Como en español, la edad, el hambre, la sed y el frío van con avoir: j'ai vingt ans, j'ai faim, j'ai soif, j'ai froid. | Inventaire D p. 49 (presente de verbos usuales, A1 clave); Niveau A2 §5.1.1.1-5.1.1.2 p. 106 (être, avoir; -ai, -as, -a, -ons, -ez, -ont); Inventaire F p. 62 (J'ai 18 ans; Je suis de Berlin; Vous êtes…), p. 63 (Je suis fatigué; ont très froid; ont deux enfants), p. 64 (Nous sommes…), p. 65 (sont à la maison), p. 66 (J'ai faim; Il a soif); Niveau A2 p. 108 (Tu es content ?) |  |
| i2 | Idea | — | Para presentar algo o a alguien («es…»), el francés usa c'est (ce + est, unidos con apóstrofo): C'est un livre. C'est Marie. Con un plural se escribe ce sont: Ce sont mes amis. (En el habla informal también se oye c'est con plural, pero la forma cuidada es ce sont.) Para preguntar: Qui est-ce ? (¿quién es?) y Qu'est-ce que c'est ? (¿qué es?). «Hay» se dice il y a, un bloque de tres palabras que no cambia aunque lo que sigue sea plural: il y a un chat, il y a deux chats. No lo confundas con il a (él tiene). | Inventaire D p. 49 (Qui est-ce ? / Qu'est-ce que c'est ?, A1 clave), p. 52 (C'est, ce sont; Il y a, A1 clave); Inventaire F pp. 64-66; Niveau A2 §5.2.2 p. 108; BDL «C'EST et CE SONT»; BDL «élision obligatoire» |  |
| t1 | Cómo pensarlo | J'ai vingt ans. | «Tengo veinte años.» → Igual que en español, la edad va con avoir (tener). No olvides ans al final. | Inventaire F p. 62 (J'ai 18 ans), p. 64 (Quel âge as-tu ?) |  |
| t2 | Cómo pensarlo | Je suis de Santiago. Je suis à la maison. | «Soy de Santiago. Estoy en la casa.» → Ser y estar se dicen igual: être. El bloque je suis sirve para los dos. | Inventaire F p. 62 (Je suis de Berlin), p. 65 (Nos parents sont à la maison) |  |
| t3 | Cómo pensarlo | C'est un livre. | «Es un libro.» → En español «es» va solo. En francés el verbo necesita su sujeto: ce, que se une con est y queda c'est. | Inventaire F p. 64 (C'est un cahier); BDL «élision obligatoire» |  |
| t4 | Cómo pensarlo | Il y a un problème. | «Hay un problema.» → «Hay» es un bloque de tres palabras: il y a. Con plural no cambia: il y a deux problèmes. | Niveau A2 §5.2.2 p. 108 (Il y a un problème); Inventaire F p. 65 |  |
| e1 | Ejemplo | J'ai vingt ans. | Tengo veinte años. | Inventaire F p. 62 (J'ai 18 ans) |  |
| e2 | Ejemplo | Je suis de Santiago. | Soy de Santiago. | Inventaire F p. 62 (Je suis de Berlin) |  |
| e3 | Ejemplo | Qui est-ce ? C'est ma sœur. | ¿Quién es? Es mi hermana. | Inventaire F p. 64 (igual) |  |
| e4 | Ejemplo | Qu'est-ce que c'est ? C'est un cahier. | ¿Qué es? Es un cuaderno. | Inventaire F p. 64 (igual) |  |
| e5 | Ejemplo | Il y a cinq personnes dans ma famille. | Hay cinco personas en mi familia. | Inventaire F p. 65 (igual) |  |
| e6 | Ejemplo | Pierre et Jeanne, ce sont mes parents. | Pierre y Jeanne son mis papás. | Inventaire F p. 66 (igual) |  |
| p1 | Trampa | C'est un livre. | Error: «Est un livre.» → Como en la lección 1, el verbo necesita su sujeto. «Es un…» se dice c'est un… | Inventaire F p. 64; BDL «élision obligatoire» |  |
| p2 | Trampa | Il y a un problème. | Error: «Il a un problème.» → Il a un problème quiere decir «él tiene un problema». Para «hay un problema», no olvides la y: il y a. | Niveau A2 p. 108 |  |
| p3 | Trampa | Ils ont deux enfants. | Error: «Ils sont deux enfants.» → Ils ont (tienen) e ils sont (son, están) suenan parecido. Para «tienen dos hijos» es ils ont, de avoir. | Inventaire F p. 63 (Jeanne et Mario ont deux enfants); Niveau A2 p. 106 |  |
| x1 | Ordenar | Qui est-ce ? C'est ma sœur. | Ordena las palabras: «¿Quién es? Es mi hermana». Fichas: «sœur» «Qui» «C'est» «est-ce» «ma» Regla: Para preguntar por una persona: Qui est-ce ? Para responder: C'est + la persona. | Inventaire D p. 49; Inventaire F p. 64 |  |
| x2 | Ordenar | Il y a un chat dans la maison. | Ordena las palabras: «Hay un gato en la casa». Fichas: «un» «a» «maison» «Il» «dans» «y» «chat» «la» También se acepta: «Dans la maison, il y a un chat.» Regla: «Hay» es el bloque il y a, siempre en ese orden: il + y + a. | Niveau A2 p. 108; Inventaire F p. 66 (Dans le salon, il y a…) |  |
| x3 | Ordenar | Mon frère a douze ans. | Ordena las palabras: «Mi hermano tiene doce años». Fichas: «a» «douze» «frère» «ans» «Mon» Regla: Quién + avoir + la edad + ans: Mon frère + a + douze ans. | Inventaire F p. 62, p. 63 |  |
| x4 | Completar | J'ai | Completa: «Tengo veinte años». Hueco: «___ vingt ans.» Errores previstos: «Je suis» → La edad va con avoir, igual que «tengo»: j'ai vingt ans. «Je ai» → Ai empieza con vocal: je pierde la e y se une con apóstrofo, j'ai. Regla: La edad va con avoir: j'ai + la edad + ans. | Inventaire F p. 62; BDL «élision obligatoire» |  |
| x5 | Completar | ce sont | Completa con la forma que se escribe: «Pierre y Jeanne son mis papás». Hueco: «Pierre et Jeanne, ___ mes parents.» Errores previstos: «c'est» → En el habla informal se oye, pero con un plural (mes parents) la forma cuidada es ce sont. «sont» → Falta el sujeto: ce sont. Regla: Para presentar algo en plural se escribe ce sont. | BDL «C'EST et CE SONT»; Inventaire F p. 66 |  |
| x6 | Completar | Il y a | Completa: «Hay dos gatos en la casa». Hueco: «___ deux chats dans la maison.» Errores previstos: «Il a» → Il a quiere decir «él tiene». Para «hay» se dice il y a. «Il y ont» → Il y a no cambia, aunque lo que sigue esté en plural: il y a deux chats. Regla: «Hay» se dice il y a, con singular y con plural. | Niveau A2 p. 108; Inventaire F p. 65 |  |
| x7 | Completar | avez | Completa con avoir: «¿Tienen hijos?». Hueco: «Vous ___ des enfants ?» Errores previstos: «êtes» → Êtes es de être (ser, estar). Para tener se usa avoir: vous avez. «avons» → Avons va con nous. Con vous es avez. Regla: Avoir con vous: vous avez. | Niveau A2 p. 106; Inventaire F pp. 63-64 (vous avez) |  |
| x8 | Corregir | Qu'est-ce que c'est ? C'est un cahier. | Corrige la frase: «¿Qué es? Es un cuaderno». Frase con error: «Qu'est-ce que c'est ? Est un cahier.» Errores previstos: «Qu'est-ce que c'est ? Est un cahier.» → Falta el sujeto: «es un…» se dice c'est un… «Qu'est-ce que c'est ? Ce est un cahier.» → Delante de est, ce pierde la e y se une con apóstrofo: c'est. Regla: Para presentar una cosa: c'est + la cosa. | Inventaire D p. 49; Inventaire F p. 64; BDL «élision obligatoire» |  |
| x9 | Corregir | Ils ont deux enfants. | Corrige la frase. Quieres decir «Tienen dos hijos». Frase con error: «Ils sont deux enfants.» También se acepta: «Elles ont deux enfants.» Errores previstos: «Ils sont deux enfants.» → Ils sont es «son» o «están». Para «tienen» es ils ont, de avoir. Regla: Tener es avoir: ils ont, elles ont. | Inventaire F p. 63; Niveau A2 p. 106 |  |
| x10 | Corregir | J'ai froid. | Corrige la frase. Quieres decir «Tengo frío». Frase con error: «Je suis froid.» También se acepta: «Moi, j'ai froid.» Errores previstos: «Je suis froid.» → Como en español «tengo frío», la sensación de frío va con avoir: j'ai froid. «Je ai froid.» → Ai empieza con vocal: je pierde la e y se une con apóstrofo, j'ai. Regla: El hambre, la sed y el frío van con avoir: j'ai faim, j'ai soif, j'ai froid. | Inventaire F p. 63 (ont très froid); BDL «élision obligatoire» |  |
| s1 | Situación | C'est ma sœur. Elle a vingt ans. | Le muestras a un amigo francés una foto de tu familia. Dile quién es una persona y cuántos años tiene. Patrón: Presentar con c'est / ce sont y decir la edad con avoir. Otros modelos: «C'est mon frère, il a douze ans.» «Ce sont mes parents.» | Inventaire F pp. 64, 66; BDL «C'EST et CE SONT» |  |
| s2 | Situación | Il y a un lit et une table. | Describe tu pieza: di qué cosas hay. Patrón: Il y a + un / une. Otros modelos: «Dans ma chambre, il y a un lit et une chaise.» | Inventaire F p. 66; Niveau A2 p. 108 |  |

Nada marcado REVISAR en esta lección.

## Lección 3 · Los artículos (fr-a1-03)

Nivel A1. Áreas: gramática, ortografía.

Bloques del patrón (sin fuente propia; se apoyan en las ideas):

- **Definido:** `le` `la` `l'` `les`
- **Indefinido:** `un` `une` `des`
- **à / de + artículo:** `au` `à la` `à l'` `aux` `du` `de la` `de l'` `des`
- **Cantidad:** `pas de` `beaucoup de` `un peu de`

| id | Tipo | Francés | Español o explicación | Fuente | REVISAR |
|---|---|---|---|---|---|
| i1 | Idea | — | En francés casi todo sustantivo lleva una palabra delante, casi siempre un artículo. El artículo muestra si es masculino o femenino, singular o plural. El definido (el, la, los, las) es le, la, les; delante de vocal o de h muda, le y la se vuelven l': l'eau, l'hôtel. El indefinido (un, una, unos, unas) es un, une, des. Ojo: con un plural que se cuenta (niños, amigos), donde el español no pone nada, el francés suele poner des: «hay niños» se dice il y a des enfants. El género no siempre coincide con el español (le lait, la leche; la mer, el mar), así que aprende cada sustantivo con su artículo. | Inventaire D p. 51 (artículos definidos e indefinidos, A1 clave); Inventaire F p. 62 (la mer), p. 63 (du lait), p. 65 (La secrétaire…; Des touristes…; L'hôtel; L'eau est froide); Niveau A2 §5.1.2.2 p. 107 y §5.2.4.1 p. 108; BDL «Les déterminants»; BDL «élision obligatoire» |  |
| i2 | Idea | — | À y de se juntan con le y con les, como en español a + el = al: à + le = au, à + les = aux, de + le = du, de + les = des. Con la y con l' no se juntan: à la, à l', de la, de l'. Por ejemplo: je vais au cinéma, à la piscine, à l'école. Después de una negación (ne… pas), un, une y des se vuelven de, o d' delante de vocal: je n'ai pas de voiture. Con être no cambian: ce n'est pas un livre. Después de beaucoup (mucho) y un peu (un poco) también va de sin artículo: beaucoup d'amis, un peu de sucre. | OQLF, GDT «déterminant contracté»; Niveau A2 §5.2.4.1 p. 108 (au, aux, du, des); Inventaire D p. 52 (à, au, de; un peu de, beaucoup de, pas de: A1 clave); Inventaire F p. 62 (au cinéma; à la piscine), p. 63 (à l'école), p. 64 (à la bibliothèque), p. 65 (pas de sœur; beaucoup d'amis; un peu de sucre); BDL «DE dans une phrase négative»; BDL «Les déterminants» (beaucoup de) |  |
| i3 | Idea | — | Para una cantidad de algo que no se cuenta (pan, agua, café), el francés usa el partitivo, un artículo para hablar de una cantidad sin decir cuánta: du (masculino), de la (femenino) y de l' (delante de vocal). Je mange du pain. Je bois de l'eau. En español no se pone nada: «como pan», «tomo agua». Con ne… pas, también se vuelven de: il n'y a pas de pain. | Niveau A2 p. 103 (no se sabe si es A1 o A2) y §5.2.4.1 p. 108 (partitivos en A2); Inventaire D p. 51 (partitivos: A1 clave, A2 con menos consenso); Inventaire F p. 65 (du fromage, de la salade et de l'eau); BDL «DU et DÛ»; BDL «DE dans une phrase négative» | sí |
| t1 | Cómo pensarlo | Il y a des enfants dans le parc. | «Hay niños en el parque.» → Con un plural que se cuenta (niños, amigos), donde el español no pone artículo, el francés suele poner des. | Inventaire F p. 65 (Un garçon joue dans le parc; Des touristes…); BDL «Les déterminants» |  |
| t2 | Cómo pensarlo | Je vais au cinéma. | «Voy al cine.» → Igual que a + el = al en español, en francés à + le = au. | OQLF, GDT «déterminant contracté»; Inventaire F p. 62 (On va au cinéma) |  |
| t3 | Cómo pensarlo | Je mange du pain et je bois de l'eau. | «Como pan y tomo agua.» → Para una cantidad de algo que no se cuenta, el francés pone du, de la o de l'; el español no pone nada. | Niveau A2 p. 108; Inventaire F p. 63, p. 65; BDL «DU et DÛ» | sí |
| t4 | Cómo pensarlo | Je n'ai pas de voiture. | «No tengo auto.» → Después de ne… pas, un, une y des se vuelven de. | BDL «DE dans une phrase négative»; Inventaire F p. 65 (pas de sœur) |  |
| e1 | Ejemplo | J'aime la mer et le soleil. | Me gustan el mar y el sol. | Inventaire F p. 62 (la mer), p. 67 (du soleil) |  |
| e2 | Ejemplo | Je vais au cinéma avec des amis. | Voy al cine con amigos. | Inventaire F p. 62; OQLF, GDT «déterminant contracté» |  |
| e3 | Ejemplo | Le matin, je bois du café avec du lait. | En la mañana tomo café con leche. | Inventaire F p. 63 (avec du sucre; avec du lait); Niveau A2 p. 108 | sí |
| e4 | Ejemplo | Il n'y a pas de pain. | No hay pan. | BDL «DE dans une phrase négative» (Il n'y a pas de farine) |  |
| e5 | Ejemplo | J'ai beaucoup d'amis. | Tengo muchos amigos. | Inventaire F p. 65 (igual) |  |
| e6 | Ejemplo | Les enfants sont à l'école. | Los niños están en el colegio. | Inventaire F p. 63 (à l'école); BDL «élision obligatoire» |  |
| p1 | Trampa | Je vais au cinéma. | Error: «Je vais à le cinéma.» → À + le se juntan en au, igual que a + el = al en español. | OQLF, GDT «déterminant contracté»; Inventaire F p. 62 |  |
| p2 | Trampa | L'eau est froide. | Error: «Le eau est froide.» → Delante de vocal, le y la se vuelven l'. | BDL «élision obligatoire»; Inventaire F p. 65 (L'eau est froide) |  |
| p3 | Trampa | J'ai beaucoup d'amis. | Error: «J'ai beaucoup des amis.» → Después de beaucoup va solo de (d' delante de vocal), sin artículo. | Inventaire F p. 65; BDL «Les déterminants» |  |
| p4 | Trampa | Je n'ai pas de voiture. | Error: «Je n'ai pas une voiture.» → En una negación simple, un, une y des se vuelven de: pas de voiture. | BDL «DE dans une phrase négative»; Inventaire F p. 65 |  |
| x1 | Ordenar | Je vais au cinéma avec des amis. | Ordena las palabras: «Voy al cine con amigos». Fichas: «amis» «au» «Je» «avec» «cinéma» «vais» «des» También se acepta: «Avec des amis, je vais au cinéma.» Regla: À + le = au: au cinéma. Y con un plural que se cuenta, donde el español no pone artículo, el francés suele poner des: des amis. | OQLF, GDT «déterminant contracté»; Inventaire F pp. 62, 65 |  |
| x2 | Ordenar | Il y a beaucoup de restaurants en ville. | Ordena las palabras: «Hay muchos restaurantes en la ciudad». Fichas: «restaurants» «Il» «de» «en» «beaucoup» «a» «ville» «y» También se acepta: «En ville, il y a beaucoup de restaurants.» Regla: Después de beaucoup va de sin artículo: beaucoup de restaurants. | Inventaire F p. 66 (igual); Inventaire D p. 52 |  |
| x3 | Completar | au | Completa: «Voy al cine». Hueco: «Je vais ___ cinéma.» Errores previstos: «à le» → À + le se juntan: au cinéma. «à la» → Cinéma es masculino (le cinéma). À + le = au. Regla: À + le = au. | OQLF, GDT «déterminant contracté»; Inventaire F p. 62 |  |
| x4 | Completar | à l' | Completa: «Los niños están en el colegio». Hueco: «Les enfants sont ___école.» Errores previstos: «au» → Au no va delante de vocal. Le se vuelve l' y queda à l'école. «à le» → Delante de vocal, le se vuelve l': à l'école. «à la» → Delante de vocal, la se vuelve l': à l'école. Regla: Delante de vocal, le y la se vuelven l', y à no se junta: à l'école. | BDL «élision obligatoire»; Inventaire F p. 63; OQLF, GDT «déterminant contracté» |  |
| x5 | Completar | la | Completa con el artículo: «Me gusta el mar». Hueco: «J'aime ___ mer.» Errores previstos: «le» → Mer es femenino en francés: la mer, aunque en español sea «el mar». Regla: El género no siempre coincide con el español: la mer. | Inventaire F p. 62 (je préfère la mer) |  |
| x6 | Completar | de | Completa: «No tengo auto». Hueco: «Je n'ai pas ___ voiture.» Errores previstos: «une» → Después de ne… pas, une se vuelve de: pas de voiture. «d'» → D' solo va delante de vocal. Voiture empieza con consonante: de. Regla: Después de ne… pas, un, une y des se vuelven de. | BDL «DE dans une phrase négative»; Inventaire F p. 65 |  |
| x7 | Completar | du | Completa: «En la mañana tomo café» (café en general, sin decir cuánto). Hueco: «Le matin, je bois ___ café.» Errores previstos: «de le» → De + le se juntan: du café. «de» → Sin negación, para una cantidad de café se usa du. «un» → Je bois un café también es correcto, pero quiere decir «tomo un café» (una taza). Para café en general, sin decir cuánto, se usa du. Regla: Para una cantidad de algo masculino que no se cuenta: du. | Niveau A2 p. 108; Inventaire F p. 63; BDL «DU et DÛ» | sí |
| x8 | Corregir | Elle parle aux enfants. | Corrige la frase: «Ella les habla a los niños». Frase con error: «Elle parle à les enfants.» También se acepta: «Elle, elle parle aux enfants.» Errores previstos: «Elle parle à les enfants.» → À + les se juntan: aux enfants. Regla: À + les = aux. | OQLF, GDT «déterminant contracté»; Niveau A2 p. 108 (aux voisins) |  |
| x9 | Corregir | J'ai beaucoup de livres. | Corrige la frase: «Tengo muchos libros». Frase con error: «J'ai beaucoup des livres.» También se acepta: «Moi, j'ai beaucoup de livres.» Errores previstos: «J'ai beaucoup des livres.» → Después de beaucoup va de sin artículo: beaucoup de livres. «J'ai beaucoup livres.» → Falta de: beaucoup de livres. Regla: Después de beaucoup va de sin artículo. | Inventaire F pp. 64-65 (beaucoup de biscuits; beaucoup d'amis); BDL «Les déterminants» |  |
| x10 | Corregir | Il n'y a pas de lait. | Corrige la frase: «No hay leche». Frase con error: «Il n'y a pas du lait.» Errores previstos: «Il n'y a pas du lait.» → Después de ne… pas, du se vuelve de: pas de lait. «Il n'y a pas de le lait.» → Después de ne… pas va de solo, sin artículo: pas de lait. Regla: Después de ne… pas, un, une, des, du, de la y de l' se vuelven de. | BDL «DE dans une phrase négative» (pas de farine; pas de vin) | sí |
| s1 | Situación | Le matin, je mange du pain et je bois du café. | Le cuentas a un amigo qué comes y qué tomas en el desayuno. Patrón: Du / de la / de l' para una cantidad de algo que no se cuenta. Otros modelos: «Je bois du thé avec du lait.» «Le matin, je mange du pain et je bois de l'eau.» | Niveau A2 p. 108; Inventaire F pp. 63, 65; BDL «DU et DÛ» | sí |
| s2 | Situación | Je vais au cinéma et à la piscine. | Le cuentas a alguien adónde vas esta semana. Patrón: À + artículo: au, à la, à l', aux. Otros modelos: «Je vais au marché et à la plage.» «Je vais au parc avec des amis.» | OQLF, GDT «déterminant contracté»; Inventaire F pp. 62-64 |  |

Motivos de REVISAR:

- **i3:** Límite A1-A2: el Inventaire los pone en A1 como expresión de cantidad; el referencial A2, en A2
- **t3:** Límite A1-A2: el Inventaire los pone en A1 como expresión de cantidad; el referencial A2, en A2
- **e3:** Límite A1-A2: el Inventaire los pone en A1 como expresión de cantidad; el referencial A2, en A2
- **x7:** Límite A1-A2: el Inventaire los pone en A1 como expresión de cantidad; el referencial A2, en A2
- **x10:** Límite A1-A2: el Inventaire los pone en A1 como expresión de cantidad; el referencial A2, en A2
- **s1:** Límite A1-A2: el Inventaire los pone en A1 como expresión de cantidad; el referencial A2, en A2
