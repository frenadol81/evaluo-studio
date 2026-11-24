
import React from 'react';
import { BatchStudent } from '../types';
import { CheckCircle, AlertCircle, Eye, Edit2, Copy, Play, Trash2, Loader2, FileCheck, CircleDashed, CheckSquare, Plus } from 'lucide-react';

interface StudentRowProps {
    student: BatchStudent;
    onUpdateName: (id: string, name: string) => void;
    onToggleGender: (id: string) => void;
    onTogglePI: (id: string) => void; 
    onRemove: (id: string) => void;
    onDuplicate: (id: string) => void;
    onGenerate: (id: string) => void;
    onEdit: (id: string) => void;
    onPreview: (id: string) => void;
    onCycleStatus: (id: string) => void;
    onUpdateStatus: (id: string, status: string) => void;
}

export const StudentRow = React.memo(({
    student,
    onUpdateName,
    onToggleGender,
    onTogglePI,
    onRemove,
    onEdit,
    onPreview,
    onUpdateStatus
}: StudentRowProps) => {

    const status = student.state?.status || 'idle';

    const handleToggleStatus = (e: React.MouseEvent) => {
        e.stopPropagation();
        const nextStatus = status === 'completed' ? 'idle' : 'completed';
        onUpdateStatus(student.id, nextStatus);
    };

    return (
        <tr className={`hover:bg-gray-50/80 transition-colors border-b border-gray-100 last:border-0 ${student.info.isPI ? 'bg-amber-50/40' : ''}`}>
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    {student.info.photoUrl ? (
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 shadow-sm shrink-0">
                            <img src={student.info.photoUrl} alt={student.info.name} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleGender(student.id); }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${student.info.gender === 'Masculí' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-pink-50 text-pink-600 border-pink-200'}`}
                        >
                            {student.info.gender === 'Masculí' ? '♂' : '♀'}
                        </button>
                    )}
                    
                    <div className="flex flex-col flex-1">
                        <input 
                            className="bg-transparent font-bold text-gray-800 outline-none border-b border-transparent focus:border-primary-200 text-sm py-0.5"
                            value={student.info.name}
                            onChange={(e) => onUpdateName(student.id, e.target.value)}
                        />
                        <div className="flex items-center gap-2 mt-1">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onTogglePI(student.id); }}
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded border transition-all ${student.info.isPI ? 'bg-amber-500 text-white border-amber-600' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
                            >
                                PI
                            </button>
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <button 
                    onClick={handleToggleStatus}
                    className="flex items-center gap-2 group hover:opacity-70 transition-all"
                >
                    {status === 'completed' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                            <CheckCircle className="w-3 h-3" /> GENERAT
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                            <CircleDashed className="w-3 h-3" /> PENDENT
                        </span>
                    )}
                </button>
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    {status === 'completed' && (
                        <button onClick={(e) => { e.stopPropagation(); onPreview(student.id); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all">
                            <Eye className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onEdit(student.id); }} className="p-2 text-primary-600 hover:bg-primary-100 rounded-xl transition-all" title="Editar">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemove(student.id); }} 
                        className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
});
