// Levenshtein distance for "did you mean?" command suggestions

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function suggestCommand(input: string): string | null {
  const commands = [
    "auth",
    "profiles",
    "post",
    "schedule",
    "status",
    "history",
    "queue",
    "platforms",
    "analytics",
    "completions",
  ];

  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const cmd of commands) {
    const distance = levenshteinDistance(input, cmd);
    if (distance < bestDistance && distance <= 3) {
      bestDistance = distance;
      bestMatch = cmd;
    }
  }

  return bestMatch;
}
