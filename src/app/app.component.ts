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

  width = 900;
  height = 600;

  nodes: GraphNode[] = []
  edges: GraphEdge[] = []

  svg: any;
  g: any;
  map: any;

  constructor(private myService: MyServiceService) {
  }


  async ngOnInit() {
    this.edges = await this.myService.getEdges();
    this.nodes = await this.myService.getNodes(this.edges);
    this.map = await this.myService.getUSMap();

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

    this.edgeBundling()

    this.svg.call(zoom);
  }

  private async drawUSMap(){
    const projection = d3.geoAlbers().scale(1280).translate([480, 300]);

    let land = topojson.merge(this.map, this.map.objects.states.geometries);
    let path = d3.geoPath();

    // draw base map
    this.g.append("path")
      .datum(land)
      .attr("class", "land")
      .attr("d", path);

    // draw interior borders
    this.g.append("path")
      .datum(topojson.mesh(this.map, this.map.objects.states, (a, b) => a !== b))
      .attr("class", "border interior")
      .attr("d", path);

    // draw exterior borders
    this.g.append("path")
      .datum(topojson.mesh(this.map, this.map.objects.states, (a, b) => a === b))
      .attr("class", "border exterior")
      .attr("d", path);
  }

  private drawNodes(){
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

  private zoomed(event: any) {
    const {transform} = event;
    this.g.attr("transform", transform);
    this.g.attr("stroke-width", 1 / transform.k);
  }

  private edgeBundling() {

  }
}
