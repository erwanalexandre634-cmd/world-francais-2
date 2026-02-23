/**
 * Algorithme de coloration Wordle côté serveur (source de vérité).
 * Renvoie un tableau de 5 valeurs : 'correct', 'present', ou 'absent'.
 */
export function colorerMot(tentative, secret) {
  const resultat = ['absent', 'absent', 'absent', 'absent', 'absent'];
  const secretRestant = secret.split('');
  const tentativeArr = tentative.split('');

  // PASSE 1 : Marquer les VERTS (bonne position)
  for (let i = 0; i < 5; i++) {
    if (tentativeArr[i] === secretRestant[i]) {
      resultat[i] = 'correct';
      secretRestant[i] = null;
    }
  }

  // PASSE 2 : Marquer les JAUNES (présente mais mauvaise position)
  for (let i = 0; i < 5; i++) {
    if (resultat[i] !== 'correct') {
      const idx = secretRestant.indexOf(tentativeArr[i]);
      if (idx !== -1) {
        resultat[i] = 'present';
        secretRestant[idx] = null;
      }
    }
  }

  return resultat;
}
