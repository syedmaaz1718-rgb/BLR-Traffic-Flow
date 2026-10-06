export function forestPredict(features, model) {
  return (
    model.trees.reduce((sum, t) => {
      let n = 0;
      while (t.left[n] !== -1)
        n = features[t.feature[n]] <= t.threshold[n] ? t.left[n] : t.right[n];
      return sum + t.value[n];
    }, 0) / model.trees.length
  );
}
