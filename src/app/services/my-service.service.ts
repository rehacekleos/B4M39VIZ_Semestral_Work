import { Injectable } from '@angular/core';
import * as d3 from "d3";
import {GraphEdge} from "../models/edge";
import {GraphNode} from "../models/node";

@Injectable({
  providedIn: 'root'
})
export class MyServiceService {

  width = 900;
  height = 600;
  hypotenuse = Math.sqrt(this.width * this.width + this.height * this.height);

  constructor() {

  }

  async getUSMap(){
    const us: any = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@1/us/10m.json");
    us.objects.states.geometries = us.objects.states.geometries.filter(this.isContinental);
    return us
  }

  private isContinental(state: any) {
    const id = parseInt(state.id);
    return id < 60 && id !== 2 && id !== 15;
  }

  async getXmlData(){
    return await d3.xml('assets/airlines.graphml');
  }

  async getEdges(){
    const edges: GraphEdge[] = [];
    const xml = await this.getXmlData();
    const xml_edges = xml.documentElement.getElementsByTagName('edge');
    for (let i = 0; i < xml_edges.length; i++) {
      const edge = xml_edges[i]
      const source = edge.getAttribute('source')
      const target = edge.getAttribute('target')
      if (!edges.includes({source: source, target: target})) {
        edges.push({
          source: source,
          target: target
        })
      }
    }
    return edges;
  }

  async getNodes(edges: GraphEdge[], projection: any){
    let nodes: GraphNode[] = []
    const xml = await this.getXmlData();
    const xml_nodes = xml.documentElement.getElementsByTagName('node');

    for (let i = 0; i < xml_nodes.length; i++) {
      const node = xml_nodes[i]
      const x = parseFloat(node.children[0].innerHTML)/10;
      const y = Math.abs(parseFloat(node.children[2].innerHTML))/10;
      const cords = projection([x,y])
      nodes.push({
        id: node.getAttribute('id'),
        longX: x,
        latY: y,
        x: cords[0],
        y: cords[1],
        size: 0,
        name: node.children[1].innerHTML.split('(')[0].trim()
      });
    }

    for (let node of nodes){
      node.size = edges.filter(e => e.source == node.id || e.target == node.id).length
      node.departure = edges.filter(e => e.source == node.id).length
      node.arrive = edges.filter(e => e.target == node.id).length
    }

    nodes = nodes.filter( node => node.size > 0);

    return nodes;
  }

  public generateSegments(nodes: any, links: any, projection: any) {
    let bundle: {nodes: any, links: any, paths: any} = {nodes: [], links: [], paths: []};

    bundle.nodes = nodes.map(function(d: any, i: any) {
      d.fx = d.x;
      d.fy = d.y;
      return d;
    });

    links.forEach((d: any, i: any) => {
      const sourceNode = nodes.find((n: any) => n.id == d.source)
      const targetNode = nodes.find((n: any) => n.id == d.target)
      let length = this.distance(sourceNode, targetNode);

      const segments = d3.scaleLinear()
        .domain([0, this.hypotenuse])
        .range([1, 10])

      let total = Math.round(segments(length));

      let xscale = d3.scaleLinear()
        .domain([0, total + 1])
        .range([sourceNode.x, targetNode.x]);

      let yscale = d3.scaleLinear()
        .domain([0, total + 1])
        .range([sourceNode.y, targetNode.y]);

      let source = sourceNode;
      let target = null;

      let local = [source];

      for (let j = 1; j <= total; j++) {
        target = {
          x: xscale(j),
          y: yscale(j)
        };

        local.push(target);
        bundle.nodes.push(target);

        bundle.links.push({
          source: source,
          target: target
        });

        source = target;
      }

      local.push(targetNode);

      bundle.links.push({
        source: target,
        target: targetNode
      });

      bundle.paths.push(local);
    });

    return bundle;
  }

  private distance(source: any, target: any) {
    const dx2 = Math.pow(target.x - source.x, 2);
    const dy2 = Math.pow(target.y - source.y, 2);

    return Math.sqrt(dx2 + dy2);
  }


}
