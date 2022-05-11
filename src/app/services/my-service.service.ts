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

  MIN_X = Number.MAX_VALUE
  MAX_X = -Number.MAX_VALUE
  MIN_Y = Number.MAX_VALUE
  MAX_Y = -Number.MAX_VALUE

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
      edges.push({
        source: edge.getAttribute('source'),
        target: edge.getAttribute('target')
      })
    }
    return edges;
  }

  async getNodes(edges: GraphEdge[]){
    const nodes: GraphNode[] = []
    const xml = await this.getXmlData();
    const xml_nodes = xml.documentElement.getElementsByTagName('node');

    for (let i = 0; i < xml_nodes.length; i++) {
      const node = xml_nodes[i]
      const x = parseFloat(node.children[0].innerHTML)/10;
      const y = Math.abs(parseFloat(node.children[2].innerHTML))/10;
      this.MIN_X = Math.min(this.MIN_X, x)
      this.MAX_X = Math.max(this.MAX_X, x)
      this.MIN_Y = Math.min(this.MIN_Y, y)
      this.MAX_Y = Math.max(this.MAX_Y, y)
      nodes.push({
        id: node.getAttribute('id'),
        x: x,
        y: y,
        name: node.children[1].innerHTML.split('(')[0].trim()
      });
    }

    let max_size = 0
    for (let node of nodes){
      node.size = edges.filter(e => e.source == node.id || e.target == node.id).length
      node.departure = edges.filter(e => e.source == node.id).length
      node.arrive = edges.filter(e => e.target == node.id).length
    }
    console.log(max_size)
    return nodes;
  }

  public generateSegments(nodes: any, links: any) {
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
