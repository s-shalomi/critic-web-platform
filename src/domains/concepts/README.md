# Concepts Domain Documentation

## Overview
The Concepts domain manages the visual concept mapping canvas during the Conceptualise stage. Students turn evidence notes into concept nodes, arrange them on an interactive canvas with physics drag behavior, and connect concepts with links.

## Key Features
- **Dynamic Node Growth & Glow**: Nodes visually expand in size and accumulate glowing aura as their link degree count increases.
- **Physics Drag Momentum**: Nodes retain smooth spring/momentum behavior on move.
- **Link Creation Audio Synthesis**: Utilizes browser Web Audio API synth tones for immediate audio-visual feedback when creating node links.
- **Persistence**: Canvas node positions, labels, and links persist in database/localStorage on reload.

## API Contracts
- `GET /api/modules/:moduleId/conceptualise`: Retrieves concept map nodes and links.
- `POST /api/modules/:moduleId/concepts`: Create a new concept node.
- `PUT /api/concepts/:nodeId`: Update node text label or X/Y canvas coordinates.
- `DELETE /api/concepts/:nodeId`: Delete concept node and connected links.
- `POST /api/modules/:moduleId/concepts/links`: Create directional link between two nodes.
- `DELETE /api/links/:linkId`: Delete link connection.
