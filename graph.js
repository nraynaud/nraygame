function displayGraph (paper, genome, generationScore) {
  paper.clear()
  const chartOpts = {
    axis: '0 0 1 1',
    smooth: true
  }
  const res = paper.linechart(30, 0, 400, 180, [...generationScore.keys()], generationScore, chartOpts).attr({
    stroke: 'lightblue'
  })
  const [forwards, backwards] = computeGraphs(genome.connections, true)
  const {orderedNodes, nodeLayers} = topologicalSort(nnInputs, backwards, forwards)
  const maxLayer = nodeLayers[orderedNodes[orderedNodes.length - 1].id]
  const layerInc = 400 / maxLayer
  let currentLayer = 0
  let currentY = 0
  const nodePositions = []
  for (const node of orderedNodes) {
    const layer = nodeLayers[node.id]
    if (currentLayer !== layer) {
      currentLayer = layer
      currentY = 0
    }
    nodePositions[node.id] = {x: layer * layerInc, y: currentY}
    currentY += 20
  }
  for (const node of orderedNodes) {
    const pos = nodePositions[node.id]
    const text = paper.text(100 + pos.x, 20 + pos.y, nodeArray[node.id].display).attr({
      'stroke': 'wheat',
      fill: 'wheat'
    })
    const style = {
      hidden: {'font-size': '15', stroke: '#F88', fill: '#F88'},
      output: {'text-anchor': 'start', 'font-size': '15', stroke: 'red', fill: 'red'},
      input: {'text-anchor': 'end'}
    }[node.type]
    text.attr(style)
  }
  for (const connection of genome.connections) {
    const pos1 = nodePositions[connection.from.id]
    const pos2 = nodePositions[connection.to.id]
    if (connection.enabled && pos1 && pos2) {
      paper.path(`M${105 + pos1.x},${20 + pos1.y}L${90 + pos2.x},${20 + pos2.y}`).attr('stroke', 'grey')
      paper.text((150 + pos1.x + 50 + pos2.x) / 1.8, (20 + pos1.y + 20 + pos2.y) / 1.8, '' + connection.weight.toFixed(1)).attr('stroke', 'wheat')
    }
  }
}