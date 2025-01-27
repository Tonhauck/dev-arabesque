import * as d3 from "d3";
import React from "react";
import { measureTextWidths } from "ol/render/canvas";
import { scaleLinear, style } from "d3";
import { cssNumber, data } from "jquery";

export default class BarChartFilter {
    constructor(
        variable,
        filter_id,
        dimension,
        group,
        render_all,
        delete_filter,
        render_legend,
        lstyle,
        nstyle,
        update_bars,
        filtered_range,
        complete_data,
        type,
        scale,

    ) {

        this.variable = variable;
        this.filter_id = filter_id;
        console.log(this.filter_id)
        this.margin = { top: 10, right: 13, bottom: 20, left: 10 };
        if (filtered_range !== null)
            this.filtered_range = filtered_range.map((el) => parseFloat(el));

        let ga = group.all();
        //Transform keys to float to prevent problems
        for (let g of ga) {
            g = parseFloat(g);
        }
        //Sort the groups
        ga.sort(function(a, b) {
            return a.key - b.key;
        });

        this.domain = [+ga[0].key, +ga[ga.length - 1].key];

        this.value = ga.map(a => a.value)


        this.axis = d3.axisBottom().ticks(5);
        this.brush = d3.brushX().extent([0, 0], [250, 100]);
        this.brushDirty = false;
        this.dimension = dimension;
        this.group = group;
        this.variable = variable;

        this.render_all = render_all;
        this.render_legend = render_legend;
        this.delete_filter = delete_filter;
        this.update_bars = update_bars;

        this.lstyle = lstyle;
        this.nstyle = nstyle;
        this.complete_data = complete_data;

        this.brush.on("brush.chart", this.brush_listener(this, null));
        this.filter_div = document.createElement("div");
        this.filter_div.id = filter_id;
        this.filter_div.className = "barchartFilter";
    }

    brush_listener(that) {
        return function() {
            const g = d3.select(this.parentNode);
            const brushRange = d3.event.selection || d3.brushSelection(this); // attempt to read brush range
            let activeRange = brushRange;

            const hasRange =
                activeRange &&
                activeRange.length === 2 &&
                !isNaN(activeRange[0]) &&
                !isNaN(activeRange[1]);

            if (!hasRange) return; // quit early if we don't have a valid range

            // calculate current brush extents using x scale
            let extents = activeRange.map(that.x.invert);

            // move brush handles to start and end of range
            g.selectAll(".brush-handle")
                .style("display", null)
                .attr("transform", (d, i) => `translate(${activeRange[i]}, 0)`);

            // resize sliding window to reflect updated range
            g.select(`#clip-${that.filter_id} rect`)
                .attr("x", activeRange[0])
                .attr("width", activeRange[1] - activeRange[0]);

            // filter the active dimension to the range extents

            that.dimension.filterAll();
            that.dimension.filterFunction(function(d) {
                return parseFloat(d) >= extents[0] && d <= extents[1];
            });

            //Update the min and max inputs when the brush moves
            document.getElementById(
                "filterMinInput-" + that.filter_id
            ).value = Math.round(extents[0]);
            document.getElementById(
                "filterMaxInput-" + that.filter_id
            ).value = Math.round(extents[1]);

            // re-render the other charts accordingly

            that.render_all();

            //Reset the active range to null so it can be both called by brush move listener
            //Or onFilterMinChange and onFilterMaxChange functions
            activeRange = null;
        };
    }

    //Creates chart
    chart(div, scale) {




        const data_groups = this.group_for_barchart();
    // Insérer un délai de 2 secondes avant de continuer
        setTimeout(() => {
        
        if (scale == "linear") {
            // Linear Scale
            this.x = d3
                .scaleLinear()
                .range([0, 250])
                .domain([this.domain[0], this.domain[1]]);
            this.y = d3.scaleLog().range([100, 0]);

            this.y.domain([1, d3.max(data_groups.map((g) => g.value))]);


        } else {
            //Log scale
            this.x = d3
                .scaleLog()
                .range([0, 250])
                // .domain([this.domain[0], this.domain[1]]);
            this.y = d3.scaleLinear().range([100, 0]);
            this.y.domain(d3.extent(data_groups, d => d.value));
            this.x.domain([1, d3.max(data_groups, d => d.key)]);
        }



        let that = this;
        const width = this.x.range()[1] + this.margin.left + this.margin.right;
        const height = this.y.range()[0];

        this.brush.extent([
            [0, 0],

            [width, height],
        ]);

        let min = this.group.all()[0].key;
        let max = this.group.all()[this.group.all().length - 1].key;



        var data_groupsFiltered = data_groups.filter(i => i.value < 0);


        let g = d3.select(div).select("g");

        // Create the skeletal chart.
        if (g.empty()) {
            let w = width + this.margin.left + this.margin.right;
            let h = height + this.margin.top + this.margin.bottom;
            g = d3
                .select(div)
                .attr("class", "barchartContainer")
                .attr('id', "barchartContainer")
                .append("svg")
                .attr("viewBox", `0 0 ${w} ${h}`)
                .attr("width", "100%")
                .attr("height", "250px")
                .attr("class", "barchart")
                .append("g")
                .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

            g.append("clipPath")
                .attr("id", `clip-${this.filter_id}`)
                .append("rect")
                .attr("width", width)
                .attr("height", height);

            g.selectAll(".bar")
                .data(["background", "foreground"])
                .enter()
                .append("path")
                .attr("class", (d) => `${d} bar`)
                .datum(this.group.all());

            g.selectAll(".foreground.bar").attr(
                "clip-path",
                `url(#clip-${this.filter_id})`
            );

            //X axis

            g.append("g")
                .attr("class", "x-axis")
                .attr("transform", "translate(-30, 50)rotate(-90)")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(this.x).ticks(2).tickFormat(d3.format(".0s")));

            //X label

            g.append("text")
                .attr("class", "axis-title")
                .attr("y", 140)
                .attr("x", 150)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .attr("fill", "#000000")
                .text(this.variable);

            //Setting the y label

            g.append("g")
                .attr("class", "y-axis")
                // .attr("transform", `translate(${width},0)`)
                .call(d3.axisLeft(this.y).ticks(2).tickFormat(d3.format(".0s")));

            g.append("text")
                .attr("class", "axis-title")
                .attr("transform", "rotate(-90)")
                .attr("y", -60)
                .attr("x", -35)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .attr("fill", "#000000")
                .text("Count");
        }


        // Initialize the brush component with pretty resize handles.
        var gBrush = g.append("g").attr("class", "brush").attr("id", "brush").call(this.brush);

        gBrush
            .selectAll(".handle--custom")
            .data([{ type: "w" }, { type: "e" }])
            .enter()
            .append("path")
            .attr("class", "brush-handle")
            .attr("cursor", "ew-resize")
            .attr("d", this.resizePath)
            .style("display", "none");

        // Only redraw the brush if set externally.
        if (this.brushDirty !== false) {
            const filterVal = this.brushDirty;
            this.brushDirty = false;

            d3.select(".title a").style(
                "display",
                d3.brushSelection(div) ? null : "none"
            );

            if (!filterVal) {
                g.call(this.brush);

                g.selectAll(`#clip-${this.filter_id} rect`)
                    .attr("x", 0)
                    .attr("width", width);

                g.selectAll(".brush-handle").style("display", "none");
                renderAll();
            } else {
                const range = filterVal.map(this.x);
                this.brush.move(gBrush, range);
            }
        }
    
        g.selectAll(".bar").attr("d", this.barPathF(this, data_groups));

        function resizePath(d) {
            const e = +(d.type === "e");
            const x = e ? 1 : -1;
            const y = height / 3;

            return `M${0.5 * x},${y}A6,6 0 0 ${e} ${6.5 * x},${y + 6}V${2 * y - 6
                }A6,6 0 0 ${e} ${0.5 * x},${2 * y}ZM${2.5 * x},${y + 8}V${2 * y - 8}M${4.5 * x
                },${y + 8}V${2 * y - 8}`;
        }

           }, 300); // Délai de 2 secondes
    }


    barPathF(that, groups) {
        let path = [];
        let height = that.y.range()[0];

        for (let d of groups) {


            path.push(
                "M",
                that.x(+parseFloat(d.key)),
                ",",
                height,
                "V",
                that.y(d.value + 1),
                "h9V",
                height,

            );




        }
        return path.join(" ");
    }

    group_for_barchart() {
        const min = this.domain[0];
        const max = this.domain[1];
       

        const nb_groups = 50;
        let sorted_data = this.complete_data
            .map((d) => parseFloat(d[this.variable]))
            .sort((a, b) => a - b);

        let breaks = [];
        let groups = [];
        let sorted_data_copy = sorted_data.slice(); // Use slice to copy the array

        // Compute the breaks of the data (with equal amplitudes method)
        for (let i = 0; i <= nb_groups; i++) {
            let break_i = min + ((max - min) / nb_groups) * i;
       
            breaks.push(break_i);
        }

       

        for (let i = 0; i < nb_groups; i++) {
            let group = [];
            // While the data is between the first two breaks, we add it to group
            for (let d of sorted_data_copy) {
                if (d >= breaks[i] && d < breaks[i + 1]) {
                    group.push(d);
                } else {
                    // If it's not (as data are sorted), the group is full
                    break;
                }
            }
            groups.push({ key: breaks[i] + 1, value: group.length });
            sorted_data_copy = sorted_data_copy.slice(group.length);
        }

      
        return groups;
    }

    //On filter minimum input change
    onFilterMinChange(event) {
        //Get min and max from inputs
        let min = parseFloat(event.target.value);

        if (min > this.domain[1] || min < this.domain[0]) {
            document
                .getElementById("filterMinInput-" + this.filter_id)
                .classList.add("is-invalid");
            return;
        } else {
            document
                .getElementById("filterMinInput-" + this.filter_id)
                .classList.remove("is-invalid");
        }

        let max = parseFloat(
            document.getElementById("filterMaxInput-" + this.filter_id).value
        );

        this.update_brush_extent([min, max]);
    }
    onFilterMaxChange(event) {
        //Get min and max from inputs
        let max = parseFloat(event.target.value);
        if (max > this.domain[1] || max < this.domain[0]) {
            document
                .getElementById("filterMaxInput-" + this.filter_id)
                .classList.add("is-invalid");
            return;
        } else {
            document
                .getElementById("filterMaxInput-" + this.filter_id)
                .classList.remove("is-invalid");
        }
        let min = parseFloat(
            document.getElementById("filterMinInput-" + this.filter_id).value
        );

        this.update_brush_extent([min, max]);
    }
    render_title() {
        let title_icon = document.createElement("img");
        title_icon.className = "flowFilterIcon";
        title_icon.id = "flowFilterIcon";
        /*    if (title_icon.className.includes("nodes")) {
               title_icon.src = "./assets/svg/si-glyph-node.svg";
           }
           else {
               title_icon.src = "./assets/svg/si-glyph-link.svg";
           }
    */
        let layer = $("#filteredLayer :selected").text()




        title_icon.src = "./assets/svg/si-glyph-" + layer.toLowerCase() + ".svg";


        if (title_icon.src.includes("si-glyph-.svg") == true) {

            title_icon.src = "./assets/svg/si-glyph-links.svg";
        }

        let title_div = document.createElement("label");
        title_div.className = "filterTitle";
        title_div.innerHTML = this.variable;
        this.filter_div.appendChild(title_icon);
        this.filter_div.appendChild(title_div);
    }

    render_chart() {
        let chart_div = document.createElement("div");
        // chart_div.id = `chart-${target}-${id}-${type}`;
        //In order to resize the graph
        this.chart(chart_div, 'linear');
        this.filter_div.appendChild(chart_div);
    }

    render_radio_log() {
        let chart_div = document.createElement("div");
        chart_div.className = "logOrLinContainer";

        let radiobox_container = document.createElement("div");
        var radiobox = document.createElement('input')
        radiobox_container.className = "maxMinContainer";
        radiobox.type = 'radio';
        radiobox.id = 'log';
        radiobox.class = 'maxMinContainer';
        radiobox.class = 'radioLogLin' + this.filter_id;
        radiobox.value = 'log';
        radiobox.name = 'log_or_lin' + this.filter_id;

        var label = document.createElement('label')
        label.htmlFor = 'log';

        var description = document.createTextNode(' Log Scale');
        label.appendChild(description);

        let radiobox2_container = document.createElement("div")
        radiobox2_container.className = "maxMinContainer";
        var radiobox2 = document.createElement('input');
        radiobox2.type = 'radio';
        radiobox2.id = 'linear';
        radiobox2.class = 'maxMinContainer';
        radiobox2.class = 'radioLogLin' + this.filter_id;
        radiobox2.value = 'linear';
        radiobox2.name = 'log_or_lin' + this.filter_id;
        radiobox2.checked = true;

        var label2 = document.createElement('label')
        label2.htmlFor = 'linear';

        var description2 = document.createTextNode(' Linear Scale');
        label2.appendChild(description2);

        //var newline = document.createElement('&nbsp;');


        radiobox2_container.appendChild(radiobox);
        radiobox2_container.appendChild(label);
        //chart_div.appendChild(newline);

        radiobox_container.appendChild(radiobox2);
        radiobox_container.appendChild(label2);
        //   chart_div.appendChild(newline2);


        chart_div.appendChild(radiobox_container)
        chart_div.appendChild(radiobox2_container)

        //radios.forEach(radio => radio.addEventListener('change', () => alert(radio.value)));

        radiobox2.onchange = this.onLogLinChange.bind(this);
        radiobox.onchange = this.onLogLinChange.bind(this);

        this.filter_div.appendChild(chart_div)

    }

    onLogLinChange(event) {
        console.log(event.target.value);

        let chart_div = document.createElement("div");

        this.chart(chart_div, event.target.value);

        let parent_div = document.getElementById(this.filter_id);

        let container = parent_div.querySelector(".barchartContainer");

        // Supprimez l'ancien chart s'il existe
        let old_chart = container.querySelector(".barchart");
        if (old_chart) {
            old_chart.remove();
        }
        container.appendChild(chart_div);
    }


    render_minmax_inputs() {

        let min_max_div = document.createElement("div");
        min_max_div.id = "filterMinMax";

        let minLabel = document.createElement("div");
        minLabel.innerHTML = "Min";
        minLabel.className = "minMaxLabel";

        let minContainer = document.createElement("div");
        minContainer.className = "maxMinContainer";

        let maxContainer = document.createElement("div");
        maxContainer.className = "maxMinContainer";

        let minInput = document.createElement("input");
        minInput.className = "form-control filterMinInput";
        minInput.id = "filterMinInput-" + this.filter_id;
        minInput.value = Math.round(this.group.all()[0].key);
        minInput.onchange = this.onFilterMinChange.bind(this);

        let maxLabel = document.createElement("div");
        maxLabel.innerHTML = "Max";
        maxLabel.className = "maxMaxLabel";

        let maxInput = document.createElement("input");
        maxInput.className = "form-control filterMaxInput";
        maxInput.id = "filterMaxInput-" + this.filter_id;
        maxInput.value = Math.round(
            this.group.all()[this.group.all().length - 1].key
        );
        maxInput.onchange = this.onFilterMaxChange.bind(this);

        let min_invalid_feedback = document.createElement("div");
        min_invalid_feedback.className = "invalid-feedback";
        min_invalid_feedback.innerHTML = "Value is out of range";

        let max_invalid_feedback = document.createElement("div");
        max_invalid_feedback.className = "invalid-feedback";
        max_invalid_feedback.innerHTML = "Value is out of range";

        minContainer.appendChild(minLabel);
        min_max_div.appendChild(minContainer);
        minContainer.appendChild(minInput);

        // min_max_div.appendChild(min_invalid_feedback);
        maxContainer.appendChild(maxLabel);
        min_max_div.appendChild(maxContainer);
        maxContainer.appendChild(maxInput);

        /*     min_max_div.appendChild(maxLabel);
            min_max_div.appendChild(maxInput); */
        min_max_div.appendChild(max_invalid_feedback);

        this.filter_div.appendChild(min_max_div);
    }

    render_trash_icon() {
        let trash_div = document.createElement("img");
        trash_div.className = "barchartTrashIcon";
        trash_div.src = "./assets/svg/si-glyph-trash.svg";
        trash_div.onclick = this.delete_filter;

        this.filter_div.appendChild(trash_div);
    }

    render_bottom_line() {
        let line = document.createElement("div");
        line.className = "filterBottomLine";

        this.filter_div.appendChild(line);
    }

    render() {
        this.render_title();
        this.render_chart();
        this.render_trash_icon();
        this.render_radio_log();
        this.render_minmax_inputs();
        this.render_bottom_line();
        return this.filter_div;
    }

    update_brush_extent(data_range) {
        //Convert data_range received to brush range in pixels
        let brush_range = data_range.map(this.x);
        let brush = document.getElementsByClassName("brush")[0];
        d3.select(brush).call(this.brush.move, [brush_range[0], brush_range[1]]);
    }
}