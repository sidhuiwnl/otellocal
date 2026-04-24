import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

/* ================= TYPES ================= */

type GraphNode = {
  id: string
  service: string
  spanCount: number
  errorCount: number
}

type GraphEdge = {
  source: string | GraphNode
  target: string | GraphNode
  count: number
  errorRate: number
  avgMs: number
}

type GraphData = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

type SimNode = GraphNode & d3.SimulationNodeDatum

type SimEdge = d3.SimulationLinkDatum<SimNode> & {
  count: number
  errorRate: number
  avgMs: number
}

/* ================= COMPONENT ================= */

export default function ServiceGraph() {
  const svgRef = useRef<SVGSVGElement | null>(null)

  const [graph, setGraph] = useState<GraphData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  /* ========== FETCH DATA ========== */
   const fetchGraph = () => {            // ← extract to named function
    setLoading(true)
    fetch('http://localhost:4320/api/graph')
      .then(r => r.json())
      .then(data => { setGraph(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }

  useEffect(() => {
    fetchGraph()
  }, [])

  /* ========== D3 RENDER ========== */
  useEffect(() => {
    if (!graph || !svgRef.current) return
    if (!graph.nodes.length) return

    const W = svgRef.current.clientWidth || 600
    const H = 400

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3
      .select(svgRef.current)
      .attr('width', W)
      .attr('height', H)

    /* ---------- ARROW ---------- */
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#555')

    /* ---------- DATA ---------- */
    const nodes: SimNode[] = graph.nodes.map(n => ({ ...n }))
    const edges: SimEdge[] = graph.edges.map(e => ({ ...e }))

    /* ---------- HELPERS ---------- */
    const edgeColor = (errorRate: number) => {
      if (errorRate > 20) return '#E24B4A'
      if (errorRate > 5) return '#EF9F27'
      return '#1D9E75'
    }

    const edgeWidth = (count: number) => Math.min(1 + count / 10, 5)
    const nodeRadius = (spanCount: number) => Math.min(14 + spanCount / 20, 36)

   const getNode = (n: string | number | SimNode): SimNode | null => {
      if (typeof n === 'object') return n
      return null
    }

    /* ---------- SIMULATION ---------- */
    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force(
        'link',
        d3.forceLink<SimNode, SimEdge>(edges)
          .id(d => d.id)
          .distance(140)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide<SimNode>().radius(50))

    /* ---------- LINKS ---------- */
    const link = svg.append('g')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', d => edgeColor(d.errorRate))
      .attr('stroke-width', d => edgeWidth(d.count))
      .attr('opacity', 0.7)
      .attr('marker-end', 'url(#arrow)')

    /* ---------- LINK LABELS ---------- */
    const linkLabel = svg.append('g')
      .selectAll('text')
      .data(edges)
      .join('text')
      .attr('font-size', 10)
      .attr('fill', '#888')
      .attr('font-family', 'monospace')
      .attr('text-anchor', 'middle')
      .text(d => `${d.avgMs}ms`)

    /* ---------- NODES ---------- */
    const node = svg.append('g')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .join('g')
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    /* ---------- NODE CIRCLE ---------- */
    node.append('circle')
      .attr('r', d => nodeRadius(d.spanCount))
      .attr('fill', '#1e1e21')
      .attr('stroke', d => (d.errorCount > 0 ? '#E24B4A' : '#7c6af7'))
      .attr('stroke-width', 2)

    /* ---------- NODE LABEL ---------- */
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', 11)
      .attr('fill', '#e8e8ea')
      .attr('font-family', 'monospace')
      .text(d => d.service)

    /* ---------- ERROR BADGE ---------- */
    node.filter(d => d.errorCount > 0)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.8em')
      .attr('font-size', 10)
      .attr('fill', '#E24B4A')
      .text(d => `${d.errorCount} err`)

    /* ---------- TOOLTIP ---------- */
    node.append('title')
      .text(d => `${d.service}\nspans: ${d.spanCount}\nerrors: ${d.errorCount}`)

    /* ---------- TICK ---------- */
    simulation.on('tick', () => {
      link
      .attr('x1', d => getNode(d.source)?.x ?? 0)
      .attr('y1', d => getNode(d.source)?.y ?? 0)
      .attr('x2', d => getNode(d.target)?.x ?? 0)
      .attr('y2', d => getNode(d.target)?.y ?? 0)

     linkLabel
      .attr('x', d =>
        ((getNode(d.source)?.x ?? 0) + (getNode(d.target)?.x ?? 0)) / 2
      )
      .attr('y', d =>
        ((getNode(d.source)?.y ?? 0) + (getNode(d.target)?.y ?? 0)) / 2
      )

      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => {
    simulation.stop()
  }
  }, [graph])

  /* ========== UI STATES ========== */

  if (loading) return <div className="empty-state">building graph...</div>

  if (error) return (
    <div className="empty-state">
      error: {error}
    </div>
  )

  if (!graph?.nodes?.length) {
    return (
      <div className="empty-state">
        no services yet — send some traces first
      </div>
    )
  }

  /* ========== RENDER ========== */

  return (
     <div className="service-graph">
      <div className="graph-legend">
        <span className="legend-item"><span className="dot" style={{background:'#1D9E75'}} /> low error rate</span>
        <span className="legend-item"><span className="dot" style={{background:'#EF9F27'}} /> &gt;5% errors</span>
        <span className="legend-item"><span className="dot" style={{background:'#E24B4A'}} /> &gt;20% errors</span>
        <button className="btn" onClick={fetchGraph} style={{marginLeft:'auto'}}>
          ↻ refresh
        </button>
      </div>
      <svg ref={svgRef} style={{ width: '100%', height: 400, display: 'block' }} />
    </div>
  )
}