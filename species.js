// CLUSTERS ARE SPECIES

// a nice summation function
const arraySum = (array, accessor) => array.reduce((accumulator, value, index) => accumulator + accessor(value, index), 0)

function computeDistanceCentroid (genome1, centroid) {
  const genome = genome1.innovationGenome
  const nExcess = Math.abs(genome.length - centroid.averageLength)
  let nDisjoint = centroid.genes.reduce((accumulator, gene, innovation) =>
    accumulator + Math.abs((innovation in genome) - gene.averageExists), 0)
  let weightDiff = centroid.genes.reduce((accumulator, gene, innovation) =>
    accumulator + (innovation in genome && gene.averageExists && Math.abs(genome[innovation].weight - gene.averageWeight)), 0)
  // no division by N, see https://sharpneat.sourceforge.io/research/speciation-canonical-neat.html
  return C1 * nExcess + C2 * nDisjoint + C3 * weightDiff
}

function selectInitialCentroids (count, genomes) {
  const newGenomes = [...genomes]
  const centroids = []
  while (centroids.length < count)
    centroids.push((newGenomes.splice(Math.floor(newGenomes.length * Math.random()), 1))[0])
  // converts the normal genomes into statistical centroids
  return centroids.map(g => computeCentroid([g]))
}

// compute a "statistical" version of a genome
// averageLength is used to compute the Ne factor
// averageExists is used to compute the Nd factor
// averageWeight is used to compute the Weight difference
function computeCentroid (arrayOfGenomes) {
  const innovationGenomes = arrayOfGenomes.map(g => g.innovationGenome)
  const averageLength = arraySum(innovationGenomes, currentValue => currentValue.length) / arrayOfGenomes.length
  const genes = []
  for (let innovation = 0; innovation < nextInnovation; innovation++) {
    let existCount = arraySum(innovationGenomes, g => (innovation in g))
    const averageExists = existCount / arrayOfGenomes.length
    const averageWeight = innovationGenomes.reduce((accumulator, g) => accumulator + (innovation in g && g[innovation].weight), 0) / existCount
    genes[innovation] = {averageExists, averageWeight}
  }
  return {averageLength, genes}
}

function refillEmptyClusters (clusters, centroids) {
  const clusterSizes = clusters.map((c, i) => ({l: c.length, index: i}))
  clusterSizes.sort((c1, c2) => c1.l - c2.l)
  const biggestCluster = clusterSizes.pop()
  const emptyClusters = clusterSizes.filter(c => c.l === 0)
  for (c of emptyClusters) {
    // the clusters are sorted by increasing distance to the centroid
    // so we are stealing the furthest item
    let stolenItem = clusters[biggestCluster.index].pop()
    clusters[c.index].push(stolenItem)
    centroids[c.index] = computeCentroid([stolenItem.genome])
  }
}

const KMEAN_MAX_ITERATIONS = 20

// loop over the clustering
function kMeans (birds, centroids) {
  let previousClusterSizes = null
  let clusters
  for (let i = 0; i < KMEAN_MAX_ITERATIONS; i++) {
    clusters = clusterBirds(birds, centroids)
    centroids = clusters.map(cluster => computeCentroid(cluster.map(b => b.genome)))
    refillEmptyClusters(clusters, centroids)
    const clusterSizes = clusters.map(c => c.length)
    if (previousClusterSizes && clusterSizes.every((s, index) => s === previousClusterSizes[index])) {
      break
    }
    previousClusterSizes = clusterSizes
  }
  const newSizes = computeSpeciesNewSize(clusters)
  return {clusters, centroids, newSizes}
}

// one loop of clustering
// each cluster will be returned sorted by the distance to the centroid
function clusterBirds (birds, centroids) {
  const clusters = centroids.map(() => [])
  for (const bird of birds) {
    let minDistance = Infinity
    let closestCentroidIndex = null
    for (let i = 0; i < centroids.length; i++) {
      const dist = computeDistanceCentroid(bird.genome, centroids[i])
      if (dist < minDistance) {
        minDistance = dist
        closestCentroidIndex = i
      }
    }
    clusters[closestCentroidIndex].push({bird, minDistance})
  }
  clusters.forEach(cluster => cluster.sort((g1, g2) => g1.minDistance - g2.minDistance))
  clusters.forEach((cluster, index) => clusters[index] = cluster.map(g => g.bird))
  return clusters
}

function computeSpeciesNewSize (clusters) {
  const clustersFitnesses = clusters.map(cluster => cluster.reduce((acc, bird) => acc + bird.lifeTime, 0) / cluster.length)
  const totalFitness = arraySum(clustersFitnesses, v => v)
  const clustersRelativeFitness = clustersFitnesses.map((cluster, index) => ({
    cluster,
    index,
    fitness: clustersFitnesses[index] / totalFitness
  }))
  clustersRelativeFitness.sort((a, b) => a.fitness - b.fitness)
  const result = []
  let remainingBirds = FLOCK_SIZE
  for (const clusterFitness of clustersRelativeFitness) {
    // min one bird per specie, last (most fit) specie might be cut short, that's the price for exploration
    clusterFitness.birdCount = Math.min(remainingBirds, Math.max(1, Math.ceil(clusterFitness.fitness * FLOCK_SIZE)))
    remainingBirds -= clusterFitness.birdCount
    result[clusterFitness.index] = clusterFitness.birdCount
  }
  return result
}