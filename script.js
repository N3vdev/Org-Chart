var chart;
var index = 0;
var compact = 0;
var actNdCent = 0;

const EXCEL_FILE_PATH = "orgchart.xlsx";

const COLUMN_CONFIG = {
  id: "Employee ID",
  parentId: "Manager ID",
  fullName: "Employee Name",
  title: "Employee Title",
};

const TREE_DEPTH = 3
const OPTIONAL_COLUMNS = {

  location: "Employee Location",
  joiningDate: "Employee Joining Date",
};

// ===============================

const REGION_CONFIG = {
  ENABLE: false, // toggle region grouping
  COLUMN_NAME: "Employee Region", // Excel column name
  LABEL_SUFFIX: " Province", // how region nodes should display
};

let data = [];

function expandAll() {
  chart.duration(0);
    chart.expandAll()
  chart.render().fit();

  // restore animation after operation
  setTimeout(() => {
    chart.duration(300);
  }, 50);
}
function collapseAll() {
  // Clear all expansion flags
  data.forEach(d => {
    d._expanded = false;
  });

  // Reapply default depth expansion
  applyExpansionDepth(TREE_DEPTH);

  chart.data(data).render().fit();
}

async function loadExcel() {
  const response = await fetch(EXCEL_FILE_PATH);
  const buffer = await response.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

function transformRows(rows) {
  return rows.map((row) => {
    const fullName = row[COLUMN_CONFIG.fullName] || "";
    const nameParts = fullName.split(" ");

    return {
      id: row[COLUMN_CONFIG.id],
      parentId: row[COLUMN_CONFIG.parentId] || null,
      first_name: nameParts[0] || "",
      last_name: nameParts.slice(1).join(" ") || "",
      department_name: row[COLUMN_CONFIG.title],
      region: row[REGION_CONFIG.COLUMN_NAME] || null,
      location: row[OPTIONAL_COLUMNS.location] || null,
      joiningDate: row[OPTIONAL_COLUMNS.joiningDate] || null,
    };
  });
}

function applyRegionGrouping(data) {
  if (!REGION_CONFIG.ENABLE) return data;

  const rootNodes = data.filter((d) => d.parentId === null);
  if (rootNodes.length === 0) return data;

  const rootId = rootNodes[0].id; // assume main root (virtual root handled later)

  // Collect unique regions from level-2 employees
  const level2Employees = data.filter((d) => d.parentId === rootId && d.region);

  const uniqueRegions = [...new Set(level2Employees.map((d) => d.region))];

  // Create region nodes
  uniqueRegions.forEach((region) => {
    const regionId = `region_${region.replace(/\s+/g, "_").toLowerCase()}`;

    data.push({
      id: regionId,
      parentId: rootId,
      first_name: region + REGION_CONFIG.LABEL_SUFFIX,
      last_name: "",
      department_name: "Region",
      _isRegionNode: true,
    });

    // Reassign only level-2 employees into their region node
    level2Employees
      .filter((emp) => emp.region === region)
      .forEach((emp) => {
        emp.parentId = regionId;
      });
  });

  return data;
}

// B. Calculate TOTAL Subordinates (Recursive)
// First, create a map of Parent ID -> Array of Children IDs


// C. Color Inheritance Logic
function processColors(data) {
  // Vibrant Modern Color Palette
  const colorPalette = [
    "#4f51d3", // Indigo
    "#0ea573", // Emerald
    "#d1880b", // Amber
    "#8b5cf6", // Violet
    "#06b6d4", // Cyan

    "#ef4444", // Red
    "#3b82f6", // Blue
  ];

  const nodeMap = {};
  data.forEach((d) => (nodeMap[d.id] = d));

  const rootNode = data.find((d) => d.parentId === null);
  const rootId = rootNode ? rootNode.id : null;

  let colorIndex = 0;
  const branchColors = {};

  data.forEach((d) => {
    // We assign colors to the direct children of the Root
    if (d.parentId === rootId) {
      branchColors[d.id] = colorPalette[colorIndex % colorPalette.length];
      colorIndex++;
    }
  });

  function getBranchColor(node) {
    if (node.id === rootId) return "#1e293b";
    if (branchColors[node.id]) return branchColors[node.id];

    let current = node;
    while (current.parentId && current.parentId !== rootId) {
      current = nodeMap[current.parentId];
      if (!current) break;
    }

    if (current && branchColors[current.id]) {
      return branchColors[current.id];
    }

    return "#64748b";
  }

  data.forEach((d) => {
    d._borderColor = getBranchColor(d);
  });
}

function applyExpansionDepth(depthLimit) {
  const nodeMap = {};
  data.forEach(d => nodeMap[d.id] = d);

  function getDepth(node) {
    let depth = 0;
    let current = node;
    const visited = new Set();

    while (current.parentId && nodeMap[current.parentId]) {
      if (visited.has(current.parentId)) break;
      visited.add(current.parentId);

      current = nodeMap[current.parentId];
      depth++;
    }

    return depth;
  }

  data.forEach(d => {
    const depth = getDepth(d);
    d._expanded = depth < depthLimit;
  });
}

function adjustColorBrightness(color, amount) {
  const clamp = (num) => Math.min(255, Math.max(0, num));
  const num = parseInt(color.replace("#", ""), 16);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0x00ff) + amount);
  const b = clamp((num & 0x0000ff) + amount);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

document.addEventListener("DOMContentLoaded", async () => {
  const rawRows = await loadExcel();
  data = transformRows(rawRows);

  const rootNodes = data.filter((d) => d.parentId === null);
  if (rootNodes.length > 1) {
    const virtualRootId = "virtual_root";
    data.push({
      id: virtualRootId,
      parentId: null,
      first_name: "Organization",
      last_name: "",
      department_name: "Headquarters",
    });
    rootNodes.forEach((node) => {
      node.parentId = virtualRootId;
    });
  }
  data = applyRegionGrouping(data);
  // B. Calculate TOTAL Subordinates
  const parentToChildren = {};
  data.forEach((d) => {
    if (d.parentId) {
      if (!parentToChildren[d.parentId]) {
        parentToChildren[d.parentId] = [];
      }
      parentToChildren[d.parentId].push(d.id);
    }
  });

  function countTotalSubordinates(id) {
    const childrenIds = parentToChildren[id] || [];
    let count = childrenIds.length;
    childrenIds.forEach((childId) => {
      count += countTotalSubordinates(childId);
    });
    return count;
  }

  function handleToggle() {
    setTimeout(() => {
      chart.fit();
    }, 120);
  }

  data.forEach((d) => {
    d._totalSubordinates = countTotalSubordinates(d.id);
  });

  // Set _expanded on all nodes up to level 3
    applyExpansionDepth(TREE_DEPTH)

  // C. Color Inheritance
  processColors(data);

  // =========================
  // YOUR RENDER BLOCK (UNCHANGED)
  // =========================

  chart = new d3.OrgChart()
    .container(".chart-container")
    .data(data)
    .nodeHeight((d) => 120)
    .nodeWidth((d) => 250)
    .childrenMargin((d) => 60)
    .compactMarginBetween((d) => 35)
    .compactMarginPair((d) => 60)
    .neightbourMargin((a, b) => 35)
    .siblingsMargin((d) => 35)
    .buttonContent(({ node, state }) => {
      const color = node.data._borderColor;

      return `<div onclick="handleToggle()" style="
            color:#ffffff;
            background: linear-gradient(135deg, ${color}, ${adjustColorBrightness(color, -20)});
            border-radius:50%;
            width:25px;
            height:25px;
            display:flex;
            align-items:center;
            justify-content:center;
            margin-top: 5px;
            margin-left: 7px;
            font-size:12px;
            cursor:pointer;
            box-shadow: 0 3px 8px rgba(0,0,0,0.15);
            border: 2px solid #ffffff;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);"> 
            <span style="font-size:10px">
            ${node.children ? `<i class="fas fa-chevron-up"></i>` : `<i class="fas fa-chevron-down"></i>`}
            </span>
        </div>`;
    })
    .linkUpdate(function (d, i, arr) {
      d3.select(this)
        .attr("stroke", (d) => d.data._borderColor)
        .attr("stroke-width", (d) =>
          d.data._upToTheRootHighlighted ? 3.5 : 2.5,
        )
        .attr("stroke-opacity", 0.8)
        .style("transition", "all 0.3s ease");

      if (d.data._upToTheRootHighlighted) {
        d3.select(this).raise();
      }
    })

    .nodeContent(function (d, i, arr, state) {
      const color = d.data._borderColor;
      const lighterColor = adjustColorBrightness(color, 30);
      const isTopNode = !d.data.parentId;

      // Special Styling for the Virtual Root
      if (isTopNode) {
        const totalEmployees = REGION_CONFIG.ENABLE
          ? data.filter((n) => !n._isRegionNode).length - 1
          : d.data._totalSubordinates;

        return `
        <div class="org-card org-card-root" style="
            font-family: 'Inter', sans-serif; 
            background: linear-gradient(135deg, ${color} 0%, ${adjustColorBrightness(color, -30)} 100%);
            position:absolute; 
            margin-top:-1px; 
            margin-left:-1px; 
            width:${d.width}px; 
            height:${d.height}px; 
            border-radius:16px; 
            display:flex; 
            flex-direction:column; 
            justify-content:center; 
            align-items:center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.1);
            border: 3px solid rgba(255,255,255,0.3);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;">
                  <div style="
                      font-size:17px; 
                      color:#ffffff; 
                      font-weight:700; 
                      margin-bottom:6px;
                      line-height: 1.3;
                      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  ">
                ${d.data.first_name} ${d.data.last_name}
            </div>
                                          <div style="
                      font-size:14px; 
                      color:rgba(255,255,255,0.95); 
                      margin-bottom:12px;
                      font-weight:500;
                      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                  ">
                ${d.data.department_name}
            </div>
                  <div style="
                      font-size:13px; 
                      color: #ffffff; 
                      background: rgba(255, 255, 255, 0.25);
                      backdrop-filter: blur(10px);
                      border: 2px solid rgba(255, 255, 255, 0.4);
                      padding: 6px 14px;
                      border-radius: 20px;
                      font-weight: 700;
                      display: inline-block;
                      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
                      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                  ">
                ${totalEmployees} ${totalEmployees === 1 ? "Reporter" : "Reportees"}
            </div>
        </div>`;
      }

      // Standard Card Styling - FULLY COLORED
      return `
          <div class="org-card" style="
              font-family: 'Inter', sans-serif; 
              background: linear-gradient(135deg, ${color} 0%, ${lighterColor} 100%);
              position:absolute; 
              margin-top:-1px; 
              margin-left:-1px; 
              width:${d.width}px; 
              height:${d.height}px; 
              border-radius:16px; 
              border: 3px solid ${color};
              box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12), 0 3px 8px rgba(0, 0, 0, 0.08);
              display:flex; 
              flex-direction:column; 
              justify-content:center; 
              align-items:center;
              padding: 20px;
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              cursor: pointer;
              position: relative;
              overflow: hidden;
          ">
              <!-- Shine effect on hover -->
              <div style="
                  position: absolute;
                  top: -50%;
                  left: -50%;
                  width: 200%;
                  height: 200%;
                  background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                  transform: rotate(45deg);
                  pointer-events: none;
              "></div>
              
              <!-- Content -->
              <div style="position: relative; z-index: 1; text-align: center; width: 100%;">
                  <div style="
                      font-size:17px; 
                      color:#ffffff; 
                      font-weight:700; 
                      margin-bottom:6px;
                      line-height: 1.3;
                      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  ">
                    ${d.data.first_name} ${d.data.last_name}
                  </div>
                  <div style="
                      font-size:14px; 
                      color:rgba(255,255,255,0.95); 
                      margin-bottom:12px;
                      font-weight:500;
                      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                  ">
                    ${d.data.department_name}
                  </div>
                  <div style="
                      font-size:13px; 
                      color: #ffffff; 
                      background: rgba(255, 255, 255, 0.25);
                      backdrop-filter: blur(10px);
                      border: 2px solid rgba(255, 255, 255, 0.4);
                      padding: 6px 14px;
                      border-radius: 20px;
                      font-weight: 700;
                      display: inline-block;
                      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
                      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                  ">
                    ${d.data._totalSubordinates} ${d.data._totalSubordinates === 1 ? "Reporter" : "Reporters"}
                  </div>
              </div>
          </div>
        `;
    })
    .nodeUpdate(function (d, i, arr) {
      const nodeElement = d3.select(this);
      const cardElement = nodeElement.select(".org-card");

      // Add hover effect with dashed border
      cardElement.on("mouseenter", function () {
        d3.select(this)
          .style("transform", "translateY(-8px) scale(1.03)")
          .style(
            "box-shadow",
            "0 15px 40px rgba(0, 0, 0, 0.2), 0 8px 16px rgba(0, 0, 0, 0.12)",
          )
          .style("border-style", "dashed")
          .style("border-width", "3px");
      });

      cardElement.on("mouseleave", function () {
        d3.select(this)
          .style("transform", "translateY(0) scale(1)")
          .style(
            "box-shadow",
            "0 8px 20px rgba(0, 0, 0, 0.12), 0 3px 8px rgba(0, 0, 0, 0.08)",
          )
          .style("border-style", "solid")
          .style("border-width", "3px");
      });
      setTimeout(() => {
        chart.fit();
      }, 100);
      nodeElement
        .select(".node-rect")
        .attr("stroke", (d) => d.data._borderColor)
        .attr(
          "stroke-width",
          d.data._highlighted || d.data._upToTheRootHighlighted ? 4 : 0,
        )
        .attr("fill", "transparent");
    })
 
    .render();



});

