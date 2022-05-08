import {Component, OnInit} from '@angular/core';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import {HttpClient} from "@angular/common/http";
import {GraphNode} from "./models/node";
import {GraphEdge} from "./models/edge";
import {MyServiceService} from "./services/my-service.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit{

  width = 975;
  height = 610;

  nodes: GraphNode[] = []
  edges: GraphEdge[] = []

  svg: any;
  g: any;
  us: any;

  constructor(private myService: MyServiceService) {
  }


  async ngOnInit() {
    this.edges = await this.myService.getEdges();
    this.nodes = await this.myService.getNodes(this.edges);

    const zoom = d3.zoom()
      .scaleExtent([0.5, 10])
      .on("zoom", this.zoomed.bind(this));

    this.svg = d3.select('#map')
      .append('svg')
      .attr("viewBox", [0, 0, this.width, this.height])
      .attr("cursor", "pointer")

    this.g = this.svg.append("g");
    this.g.attr('transform', 'translate(20, 20)')

    await this.drawUSMap();
    this.drawNodes();

    this.svg.call(zoom);
  }

  async drawUSMap(){
    await this.getUSMap();

    // add states
    this.g.append("path")
      .datum(topojson.merge(this.us, this.us.objects.lower48.geometries))
      .attr("fill", "#ddd")
      .attr("d", d3.geoPath());

    // add states border
    this.g.append("path")
      .datum(topojson.mesh(this.us, this.us.objects.lower48, (a, b) => a !== b))
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-linejoin", "round")
      .attr("d", d3.geoPath());
  }

  async getUSMap(){
    this.us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@1/us/10m.json");
    console.log(this.us)
    this.us.objects.lower48 = {
      type: "GeometryCollection",
      geometries: this.us.objects.states.geometries.filter((d: any) => {
        return d.id !== "02" && d.id !== "15";
      })
    };
  }

  drawNodes(){
    this.g.selectAll('.node')
      .data(this.nodes)
      .enter()
      .append('circle')
      .classed('node', true)
      .attr('r', (d: any) => {
        if (d.size < 50) return 3;
        else if (d.size >= 50 && d.size < 150) return 6;
        else return 9;
      })
      .attr('fill', (d: any) => {
        if (d.size < 50) return "#000";
        else if (d.size >= 50 && d.size < 150) return "rgba(0,46,123,0.97)";
        else return "#008a46";
      })
      .attr('cx', (d: any) => {
        return d.x;
      })
      .attr('cy', (d: any) => {
        return d.y;
      });
  }

  zoomed(event: any) {
    const {transform} = event;
    this.g.attr("transform", transform);
    this.g.attr("stroke-width", 1 / transform.k);
  }


}
