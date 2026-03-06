import { useCallback, useMemo } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const nodeTypes = {}; // Define custom nodes if needed

const WorkflowEditor = ({ questions, updateQuestion }) => {
    // Map questions to nodes
    const initialNodes = useMemo(() => questions.map((q, idx) => ({
        id: q.id,
        data: { label: q.label || `Question ${idx + 1}` },
        position: { x: 250, y: idx * 150 },
        style: {
            background: '#fff',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '10px',
            width: 180,
            fontSize: '12px',
            fontWeight: 'bold'
        },
    })), [questions]);

    // Map logic jumps to edges
    const initialEdges = useMemo(() => {
        const edges = [];
        questions.forEach((q) => {
            if (q.logic && q.logic.length > 0) {
                q.logic.forEach((rule, idx) => {
                    if (rule.target) {
                        edges.push({
                            id: `e-${q.id}-${rule.target}-${idx}`,
                            source: q.id,
                            target: rule.target,
                            label: `${rule.condition} ${rule.value}`,
                            labelStyle: { fontSize: '10px', fill: '#666' },
                            markerEnd: { type: MarkerType.ArrowClosed },
                            style: { stroke: '#22c55e' },
                        });
                    }
                });
            }
        });
        return edges;
    }, [questions]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback((params) => {
        // When a connection is made, add a logic jump to the source question
        const sourceQ = questions.find(q => q.id === params.source);
        if (sourceQ) {
            const newLogic = [...(sourceQ.logic || []), { condition: 'equals', value: '', target: params.target }];
            updateQuestion(params.source, 'logic', newLogic);
        }
        setEdges((eds) => addEdge(params, eds));
    }, [questions, updateQuestion, setEdges]);

    return (
        <div className="h-[600px] w-full border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
            >
                <Controls />
                <MiniMap />
                <Background variant="dots" gap={12} size={1} />
            </ReactFlow>
        </div>
    );
};

export default WorkflowEditor;
