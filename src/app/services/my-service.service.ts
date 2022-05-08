import { Injectable } from '@angular/core';
import * as d3 from "d3";
import {GraphEdge} from "../models/edge";
import {GraphNode} from "../models/node";

@Injectable({
  providedIn: 'root'
})
export class MyServiceService {

  MIN_X = Number.MAX_VALUE
  MAX_X = -Number.MAX_VALUE
  MIN_Y = Number.MAX_VALUE
  MAX_Y = -Number.MAX_VALUE

  constructor() {

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
      const x = Math.abs(parseFloat(node.children[0].innerHTML));
      const y = Math.abs(parseFloat(node.children[2].innerHTML));
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

    const new_scale_x = d3.scaleLinear().domain([this.MIN_X, this.MAX_X]).range([900, 40]);
    const new_scale_y = d3.scaleLinear().domain([this.MIN_Y, this.MAX_Y]).range([550, 50]);
    let max = 0
    for (let node of nodes){
      max = Math.max(max, edges.filter(e => e.source == node.id || e.target == node.id).length)
      node.x = new_scale_x(node.x)
      node.y = new_scale_y(node.y)
      node.size = edges.filter(e => e.source == node.id || e.target == node.id).length
      node.departure = edges.filter(e => e.source == node.id).length
      node.arrive = edges.filter(e => e.target == node.id).length
    }
    console.log(max)

    return nodes;
  }
}
