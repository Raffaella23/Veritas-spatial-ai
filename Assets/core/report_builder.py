"""
Report builder for perception loop results.
Generates HTML visualization of agent perception, stress, and cognitive maps.
"""
import json
from typing import Dict, List, Any


def generate_perception_report_html(perception_data: Dict[str, Any], project_name: str = "VERITAS Simulation") -> str:
    """
    Genera HTML report dalla percezione logger data.

    Mostra:
    - Timeline di stress per agente
    - Visibilità media per archetype
    - Cognitive map per agente
    - Zone comfort analysis
    """

    # Estrai dati
    timeline = perception_data.get('perception_timeline', [])
    cognitive_maps = perception_data.get('agent_cognitive_maps', {})
    zone_analysis = perception_data.get('zone_comfort_analysis', {})

    # Aggrega stress timeline per agente
    agent_stress_timeline = {}
    for entry in timeline:
        agent_id = entry['agent_id']
        if agent_id not in agent_stress_timeline:
            agent_stress_timeline[agent_id] = []
        agent_stress_timeline[agent_id].append({
            'tick': entry['tick'],
            'stress': entry['stress'],
            'visibility': entry['visibility_pct'],
        })

    # Build HTML
    html = f"""<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{project_name} - Perception Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.0.0/dist/chart.umd.js"></script>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }}
        h1, h2 {{
            color: #1f77b4;
        }}
        .section {{
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .chart-container {{
            position: relative;
            height: 300px;
            margin: 20px 0;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background: #f0f0f0;
            font-weight: 600;
        }}
        .comfort-low {{
            background: #ffcccc;
            color: #c00;
            font-weight: 600;
        }}
        .comfort-medium {{
            background: #fffacc;
            color: #880;
            font-weight: 600;
        }}
        .comfort-high {{
            background: #ccffcc;
            color: #060;
            font-weight: 600;
        }}
        .agent-box {{
            border-left: 4px solid #1f77b4;
            padding: 15px;
            margin: 10px 0;
            background: #f9f9f9;
        }}
        .summary {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }}
        .summary-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }}
        .summary-card h3 {{
            margin: 0 0 10px 0;
            font-size: 14px;
            text-transform: uppercase;
            opacity: 0.9;
        }}
        .summary-card .value {{
            font-size: 28px;
            font-weight: bold;
        }}
    </style>
</head>
<body>
    <h1>🧠 {project_name}</h1>
    <h2>Agent Perception & Cognitive Map Report</h2>

    <div class="section">
        <h2>📊 Simulation Summary</h2>
        <div class="summary">
            <div class="summary-card">
                <h3>Agents</h3>
                <div class="value">{len(cognitive_maps)}</div>
            </div>
            <div class="summary-card">
                <h3>Perception Samples</h3>
                <div class="value">{perception_data.get('perception_samples', 0)}</div>
            </div>
            <div class="summary-card">
                <h3>Zones Analyzed</h3>
                <div class="value">{len(zone_analysis)}</div>
            </div>
            <div class="summary-card">
                <h3>Duration</h3>
                <div class="value">{perception_data.get('simulation_duration_s', 0):.1f}s</div>
            </div>
        </div>
    </div>
"""

    # Stress timeline per agente
    html += """
    <div class="section">
        <h2>⚠️ Stress Timeline</h2>
        <p>Come lo stress degli agenti evolve durante la simulazione.</p>
"""

    for agent_id, stress_data in agent_stress_timeline.items():
        timeline_data = json.dumps(stress_data)
        html += f"""
        <div class="agent-box">
            <h3>{agent_id}</h3>
            <div class="chart-container">
                <canvas id="chart-{agent_id}"></canvas>
            </div>
        </div>
        <script>
            (function() {{
                const data = {timeline_data};
                const ctx = document.getElementById('chart-{agent_id}').getContext('2d');
                new Chart(ctx, {{
                    type: 'line',
                    data: {{
                        labels: data.map(d => 'T' + d.tick),
                        datasets: [
                            {{
                                label: 'Stress',
                                data: data.map(d => d.stress),
                                borderColor: '#ff7f0e',
                                backgroundColor: 'rgba(255, 127, 14, 0.1)',
                                tension: 0.3,
                                fill: true,
                                yAxisID: 'y1',
                            }},
                            {{
                                label: 'Visibility %',
                                data: data.map(d => d.visibility / 100),
                                borderColor: '#2ca02c',
                                backgroundColor: 'rgba(44, 160, 44, 0.1)',
                                tension: 0.3,
                                fill: true,
                                yAxisID: 'y2',
                            }}
                        ]
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {{ mode: 'index', intersect: false }},
                        scales: {{
                            y1: {{
                                type: 'linear',
                                display: true,
                                position: 'left',
                                title: {{ display: true, text: 'Stress Level' }},
                                min: 0,
                                max: 1,
                            }},
                            y2: {{
                                type: 'linear',
                                display: true,
                                position: 'right',
                                title: {{ display: true, text: 'Visibility' }},
                                min: 0,
                                max: 1,
                                grid: {{ drawOnChartArea: false }},
                            }}
                        }}
                    }}
                }});
            }})();
        </script>
"""

    html += """
    </div>
"""

    # Cognitive maps
    html += """
    <div class="section">
        <h2>🧠 Cognitive Maps</h2>
        <p>Memoria spaziale: quali zone ogni agente ha visitato e il comfort percepito.</p>
"""

    for agent_id, zones in cognitive_maps.items():
        if zones:
            html += f"""
        <div class="agent-box">
            <h3>{agent_id}</h3>
            <table>
                <tr>
                    <th>Zone</th>
                    <th>Visits</th>
                    <th>Avg Visibility</th>
                    <th>Avg Stress</th>
                    <th>Comfort</th>
                </tr>
"""
            for zone_id, zone_data in zones.items():
                comfort_class = f"comfort-{zone_data['comfort_level']}"
                html += f"""
                <tr>
                    <td>{zone_id}</td>
                    <td>{zone_data['visits']}</td>
                    <td>{zone_data['avg_visibility_pct']:.1f}%</td>
                    <td>{zone_data['avg_stress']:.3f}</td>
                    <td class="{comfort_class}">{zone_data['comfort_level'].upper()}</td>
                </tr>
"""
            html += """
            </table>
        </div>
"""

    html += """
    </div>
"""

    # Zone comfort analysis
    html += """
    <div class="section">
        <h2>🗺️ Zone Comfort Analysis</h2>
        <p>Come diverse architetture percepiscono lo stesso spazio.</p>
        <table>
            <tr>
                <th>Zone</th>
                <th>Agent</th>
                <th>Visibility %</th>
                <th>Stress</th>
                <th>Comfort</th>
            </tr>
"""

    for zone_id, zone_agents in zone_analysis.items():
        for agent_data in zone_agents:
            comfort_class = f"comfort-{agent_data['comfort_level']}"
            html += f"""
            <tr>
                <td>{zone_id}</td>
                <td>{agent_data['agent_id']}</td>
                <td>{agent_data['avg_visibility_pct']:.1f}%</td>
                <td>{agent_data['avg_stress']:.3f}</td>
                <td class="{comfort_class}">{agent_data['comfort_level'].upper()}</td>
            </tr>
"""

    html += """
        </table>
    </div>

    <div class="section">
        <h2>📝 Interpretation</h2>
        <p>
        Questo report documenta come gli agenti <strong>percepiscono</strong>,
        <strong>interpretano</strong>, e <strong>adattano il loro comportamento</strong>
        durante la simulazione.
        </p>
        <ul>
            <li><strong>Stress Timeline:</strong> Mostra come lo stress evolve in risposta alle condizioni percettive</li>
            <li><strong>Cognitive Map:</strong> Memoria delle zone visitate e il comfort associato</li>
            <li><strong>Zone Comfort:</strong> Dimostra come agenti diversi interpretano lo stesso spazio diversamente</li>
        </ul>
        <p>
        La <strong>percezione non blocca la navigazione</strong> — gli agenti continuano a muoversi
        mentre costruiscono una mappa mentale dello spazio percepito.
        </p>
    </div>

    <hr>
    <p style="text-align: center; color: #666; font-size: 12px;">
        Generated by VERITAS Spatial AI
    </p>
</body>
</html>
"""

    return html


def save_perception_report(perception_data: Dict[str, Any], filepath: str, project_name: str = "VERITAS Simulation"):
    """Salva il report HTML su file."""
    html = generate_perception_report_html(perception_data, project_name)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"📄 Report saved: {filepath}")
