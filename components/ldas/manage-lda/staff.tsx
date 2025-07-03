import { useState } from "react";
import { Gender } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusIcon, X, Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type Staff = {
  id: number;
  firstName: string;
  lastName: string;
  gender: Gender | "";
  position: string | null;
  isCommittee: boolean;
};

interface StaffTabProps {
  staffMembers: Staff[],
  ldaId: number
}

export function StaffTab({ staffMembers, ldaId }: StaffTabProps) {

  const [staff, setStaff] = useState<Staff[]>(staffMembers);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedMember, setEditedMember] = useState<Staff | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<number | null>(null);
  const [newStaff, setNewStaff] = useState<Staff>({
    id: 0,
    firstName: "",
    lastName: "",
    gender: "",
    position: "",
    isCommittee: false,
  });

  const handleAdd = () => {
    setAdding(true);
    setNewStaff({ id: 0, firstName: "", lastName: "", gender: "", position: "", isCommittee: false });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (member: Staff) => {
    // Validate required fields
    if (!member.firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    
    if (!member.lastName.trim()) {
      toast.error("Last name is required");
      return;
    }
    
    if (!member.gender) {
      toast.error("Gender is required");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const isUpdate = member.id > 0;
      const url = isUpdate 
        ? `/api/lda/${ldaId}/staff/${member.id}` 
        : `/api/lda/${ldaId}/staff`;
      
      const response = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: member.firstName,
          lastName: member.lastName,
          gender: member.gender,
          position: member.position,
          isCommittee: member.isCommittee
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save staff member');
      }
      
      const savedStaff = await response.json();
      
      if (isUpdate) {
        // Update existing staff in the list
        setStaff(staff.map(s => s.id === savedStaff.id ? savedStaff : s));
        setEditingId(null); // Exit edit mode
        toast.success("Staff member updated successfully");
      } else {
        // Add new staff to the list
        setStaff([...staff, savedStaff]);
        setAdding(false);
        toast.success("Staff member added successfully");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setAdding(false);
  };

  // Function to edit an existing staff member
  const handleEdit = (member: Staff) => {
    setEditingId(member.id);
    setEditedMember({ ...member });
  };
  
  // Function to cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedMember(null);
  };

  const openDeleteDialog = (id: number) => {
    setStaffToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!staffToDelete) return;
    
    setDeleteDialogOpen(false);
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/lda/${ldaId}/staff/${staffToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete staff member');
      }
      
      // Remove the deleted staff from the list
      setStaff(staff.filter(s => s.id !== staffToDelete));
      toast.success("Staff member deleted successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the staff member from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Staff & Committee</h2>
        <Button 
          onClick={handleAdd} 
          type="button" 
          variant="default" 
          className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1 rounded-md"
          size="sm"
          disabled={adding || isSubmitting}
        >
          <PlusIcon className="h-4 w-4" /> Add member
        </Button>
      </div>
      
      {/* Scrollable container for the table */}
      <div className="border rounded-md overflow-hidden">
        <div className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-left text-gray-500 text-sm border-b">
                <th className="py-3 px-1 pl-4 font-medium">Name</th>
                <th className="py-3 px-1 font-medium">Gender</th>
                <th className="py-3 px-1 font-medium">Position(s)</th>
                <th className="py-3 px-1 font-medium">Committee</th>
                <th className="py-3 px-1 w-10"></th>
                
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-slate-700 overflow-y-auto max-h-[400px]">
              {staff.map((member) => {
                const isEditing = editingId === member.id;
                
                return (
                  <tr key={member.id} className={`hover:bg-gray-50 ${isEditing ? 'bg-gray-50' : ''}`}>
                    <td className="py-3 px-4 whitespace-nowrap text-xs">
                      {isEditing && editedMember ? (
                        <div className="flex flex-col sm:flex-row gap-1">
                          <input
                            className="border rounded px-3 py-1.5 text-xs w-full"
                            placeholder="First name"
                            value={editedMember.firstName}
                            onChange={e => setEditedMember({ ...editedMember, firstName: e.target.value })}
                            autoFocus
                          />
                          <input
                            className="border rounded px-3 py-1.5 text-xs w-full"
                            placeholder="Last name"
                            value={editedMember.lastName}
                            onChange={e => setEditedMember({ ...editedMember, lastName: e.target.value })}
                          />
                        </div>
                      ) : (
                        `${member.firstName} ${member.lastName}`
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {isEditing && editedMember ? (
                        <Select
                          value={editedMember.gender || undefined}
                          onValueChange={(value) => setEditedMember({ ...editedMember, gender: value as Staff['gender'] })}
                        >
                          <SelectTrigger className="w-full text-xs h-8">
                            <SelectValue placeholder="Gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Gender</SelectLabel>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      ) : (
                        member.gender
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <input
                        className="w-full border rounded px-3 py-1.5 text-xs"
                        placeholder="Job title"
                        value={isEditing && editedMember ? editedMember.position ?? '' : member.position ?? ''}
                        onChange={isEditing && editedMember ? e => setEditedMember({ ...editedMember, position: e.target.value }) : undefined}
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={isEditing && editedMember ? editedMember.isCommittee : member.isCommittee}
                          onCheckedChange={isEditing && editedMember ? (checked) => 
                            setEditedMember({ ...editedMember, isCommittee: !!checked }) : undefined
                          }
                          disabled={!isEditing}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isEditing && editedMember ? (
                        <div className="flex gap-2 justify-end">
                          <Button 
                            onClick={() => handleSave(editedMember)} 
                            type="button"
                            variant="default" 
                            size="sm" 
                            className="bg-slate-900 hover:bg-slate-800"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save'
                            )}
                          </Button>
                          <Button 
                            onClick={handleCancelEdit}
                            type="button" 
                            variant="outline" 
                            size="sm"
                            className="border-gray-200"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button 
                              type="button" 
                              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem 
                              onClick={() => handleEdit(member)}
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(member.id)}
                              className="cursor-pointer flex items-center gap-2 text-red-600 focus:text-red-600"
                            >
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {/* Add new member row */}
              {adding && (
                <tr className="bg-gray-50">
                  <td className="py-3 px-1">
                    <div className="flex flex-col sm:flex-row gap-1">
                      <input
                        className="border rounded px-3 py-1.5 text-xs w-full w-1"
                        placeholder="First name"
                        value={newStaff.firstName}
                        onChange={e => setNewStaff({ ...newStaff, firstName: e.target.value })}
                        autoFocus
                      />
                      <input
                        className="border rounded px-3 py-1.5 text-xs w-full w-1"
                        placeholder="Last name"
                        value={newStaff.lastName}
                        onChange={e => setNewStaff({ ...newStaff, lastName: e.target.value })}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-1">
                    <Select
                      value={newStaff.gender || undefined}
                      onValueChange={(value) => setNewStaff({ ...newStaff, gender: value as Staff['gender'] })}
                    >
                      <SelectTrigger className="w-full text-xs h-8">
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Gender</SelectLabel>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3 px-1">
                    <input
                      className="w-full border rounded px-3 py-1.5 text-xs"
                      placeholder="Job title"
                      value={newStaff.position ?? ''}
                      onChange={e => setNewStaff({ ...newStaff, position: e.target.value })}
                    />
                  </td>
                  <td className="py-3 px-1 text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={newStaff.isCommittee}
                        onCheckedChange={(checked) => 
                          setNewStaff({ ...newStaff, isCommittee: !!checked })
                        }
                      />
                    </div>
                  </td>
                  <td className="py-3 px-1">
                    <div className="flex gap-2 justify-end">
                      <Button 
                        onClick={() => handleSave(newStaff)} 
                        type="button"
                        variant="default" 
                        size="sm" 
                        className="bg-slate-900 hover:bg-slate-800"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save'
                        )}
                      </Button>
                      <Button 
                        onClick={handleCancel}
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="border-gray-200"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
              {/* Empty state when no staff members */}
              {staff.length === 0 && !adding && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      No staff members added yet
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
