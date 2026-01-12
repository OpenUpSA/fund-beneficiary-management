import { Role } from '@prisma/client'
import { LDA_TERMINOLOGY } from '@/constants/lda'

export interface User {
  id: string | number
  name?: string | null | undefined
  email?: string | null | undefined
  image?: string | null | undefined
  role: string
  programmeOfficerId?: number | null | undefined
  ldaIds?: number[]
}

export interface LDA {
  id: number
  programmeOfficerId?: number | null
}

export interface Document {
  uploadedBy: 'Funder' | 'Fund' | 'SCAT' | 'LDA'
  createdById?: number | null
}

export interface Media {
  createdById?: number | null
  mediaSourceTypeId?: number | null
}

// Permission check functions
export const permissions = {
  // SuperUser permissions - all access
  isSuperUser: (user: User): boolean => {
    return user.role === Role.SUPER_USER
  },

  // Admin permissions
  isAdmin: (user: User): boolean => {
    return user.role === Role.ADMIN || permissions.isSuperUser(user)
  },

  // Programme Officer permissions
  isProgrammeOfficer: (user: User): boolean => {
    return user.role === Role.PROGRAMME_OFFICER || permissions.isAdmin(user)
  },

  // LDA User permissions
  isLDAUser: (user: User): boolean => {
    return user.role === Role.USER
  },

  // LDA Management permissions
  canManageLDA: (user: User | null, ldaId: number): boolean => {
    if (!user || !ldaId) return false
    if (permissions.isSuperUser(user) || permissions.isAdmin(user)) return true
    if (permissions.isProgrammeOfficer(user)) {
      return user.ldaIds?.includes(ldaId) || false
    }
    return false
  },

  canViewAllLDAs: (user: User | null): boolean => {
    if (!user) return false
    return permissions.isSuperUser(user) || permissions.isAdmin(user) || permissions.isProgrammeOfficer(user)
  },

  canViewLDA: (user: User | null, ldaId: number): boolean => {
    if (!user) return false
    if (permissions.isSuperUser(user)) return true
    if (permissions.isAdmin(user)) return true // Admins can see all LDAs
    if (permissions.isProgrammeOfficer(user)) return true // POs can see all LDAs
    if (permissions.isLDAUser(user)) {
      return user.ldaIds?.includes(ldaId) || false
    }
    return false
  },

  canCreateLDA: (user: User | null): boolean => {
    if (!user) return false
    return permissions.isSuperUser(user) // Only SuperUsers can create/delete LDAs
  },

  canDeleteLDA: (user: User | null): boolean => {
    if (!user) return false
    return permissions.isSuperUser(user) // Only SuperUsers can create/delete LDAs
  },

  // User Management permissions
  canCreateUser: (user: User, targetRole: Role): boolean => {
    if (permissions.isSuperUser(user)) return true // SuperUsers can create all user types
    if (permissions.isAdmin(user)) {
      return targetRole === 'PROGRAMME_OFFICER' || targetRole === 'USER' // Admins can create POs and LDA users
    }
    return false
  },

  canDeleteUser: (user: User): boolean => {
    if (permissions.isSuperUser(user)) return true // SuperUsers can delete all user types
    // Admins cannot delete users anymore - only SuperUsers can delete
    return false
  },

  canCreateAdmin: (user: User): boolean => {
    return permissions.isSuperUser(user) // Only SuperUsers can create/delete admins
  },

  canDeleteAdmin: (user: User): boolean => {
    return permissions.isSuperUser(user) // Only SuperUsers can create/delete admins
  },

  // User editing permissions
  canEditUser: (currentUser: User, targetUser: User): boolean => {
    if (permissions.isSuperUser(currentUser)) return true // SuperUsers can edit anyone
    if (permissions.isAdmin(currentUser)) {
      // Admins can only edit Programme Officers and LDA Users
      return targetUser.role === 'PROGRAMME_OFFICER' || targetUser.role === 'USER'
    }
    return false
  },

  // User deletion permissions (by user object)
  canDeleteSpecificUser: (currentUser: User): boolean => {
    if (permissions.isSuperUser(currentUser)) return true // Only SuperUsers can delete users
    return false // Admins and others cannot delete users
  },

  // Document permissions
  canViewDocument: (user: User, document: Document, lda?: LDA): boolean => {
    if (permissions.isSuperUser(user)) return true
    if (permissions.isAdmin(user)) return true
    if (permissions.isProgrammeOfficer(user)) {
      if (document.uploadedBy === 'LDA' && lda) {
        return lda.programmeOfficerId === user.id // POs can view documents from their LDAs
      }
      return true // POs can view all other documents
    }
    if (permissions.isLDAUser(user)) {
      if (document.uploadedBy === 'LDA') return true // LDA users can view their own documents
      if (['SCAT', 'Funder', 'Fund'].includes(document.uploadedBy)) return true // Can view top-down documents
    }
    return false
  },

  canEditDocument: (user: User, document: Document, lda?: LDA): boolean => {
    if (permissions.isSuperUser(user)) return true
    if (permissions.isAdmin(user)) {
      return ['SCAT', 'Funder', 'Fund'].includes(document.uploadedBy) // Admins can only edit top-down documents
    }
    if (permissions.isProgrammeOfficer(user)) {
      if (document.uploadedBy === 'LDA' && lda) {
        return lda.programmeOfficerId === user.id // POs can edit documents from their LDAs
      }
      return false // POs can't edit top-down documents
    }
    if (permissions.isLDAUser(user)) {
      return document.uploadedBy === 'LDA' && document.createdById === user.id // LDA users can only edit their own documents
    }
    return false
  },

  canDeleteDocument: (user: User, document: Document, lda?: LDA): boolean => {
    if (permissions.isSuperUser(user)) return true
    if (permissions.isAdmin(user)) {
      return ['SCAT', 'Funder', 'Fund'].includes(document.uploadedBy) // Admins can delete top-down documents
    }
    if (permissions.isProgrammeOfficer(user)) {
      if (document.uploadedBy === 'LDA' && lda) {
        return lda.programmeOfficerId === user.id // POs can delete documents from their LDAs (with warning)
      }
      return false // POs can't delete top-down documents
    }
    if (permissions.isLDAUser(user)) {
      return document.uploadedBy === 'LDA' && document.createdById === user.id // LDA users can only delete their own documents
    }
    return false
  },

  canCreateDocument: (user: User, uploadType: 'Funder' | 'Fund' | 'SCAT' | 'LDA'): boolean => {
    if (permissions.isSuperUser(user)) return true
    if (permissions.isAdmin(user)) {
      return ['SCAT', 'Funder', 'Fund'].includes(uploadType) // Admins can add top-down documents
    }
    if (permissions.isProgrammeOfficer(user)) {
      return uploadType === 'LDA' // POs can add LDA documents
    }
    if (permissions.isLDAUser(user)) {
      return uploadType === 'LDA' // LDA users can add their own documents
    }
    return false
  },

  // Media permissions
  canViewMedia: (user: User, media: Media, lda?: LDA): boolean => {
    if (permissions.isSuperUser(user)) return true
    if (permissions.isAdmin(user)) return true
    if (permissions.isProgrammeOfficer(user)) {
      if (lda && lda.programmeOfficerId === user.id) return true // POs can view media from their LDAs
      // POs can view media from reports but not edit
      return media.mediaSourceTypeId !== null // Assuming report media has mediaSourceTypeId
    }
    if (permissions.isLDAUser(user)) {
      if (media.createdById === user.id) return true // LDA users can view their own media
      // Media from reports locked for LDA users
      return false
    }
    return false
  },

  canEditMedia: (user: User, media: Media, lda?: LDA): boolean => {
    if (permissions.isSuperUser(user)) return true
    if (permissions.isAdmin(user)) return true
    if (permissions.isProgrammeOfficer(user)) {
      if (lda && lda.programmeOfficerId === user.id) {
        // POs can edit media from their LDAs but not report media
        return media.mediaSourceTypeId === null // Assuming report media has mediaSourceTypeId
      }
      return false
    }
    if (permissions.isLDAUser(user)) {
      // LDA users can edit their own media but not report media
      return media.createdById === user.id && media.mediaSourceTypeId === null
    }
    return false
  },

  canDeleteMedia: (user: User, media: Media, lda?: LDA): boolean => {
    if (permissions.isSuperUser(user)) return true
    if (permissions.isAdmin(user)) return true
    if (permissions.isProgrammeOfficer(user)) {
      if (lda && lda.programmeOfficerId === user.id) {
        // POs can delete media from their LDAs (with warning) but not report media
        return media.mediaSourceTypeId === null
      }
      return false
    }
    if (permissions.isLDAUser(user)) {
      // LDA users can delete their own media but not report media
      return media.createdById === user.id && media.mediaSourceTypeId === null
    }
    return false
  },

  canCreateMedia: (user: User): boolean => {
    if (permissions.isSuperUser(user)) return true
    if (permissions.isAdmin(user)) return true
    if (permissions.isProgrammeOfficer(user)) return true
    if (permissions.isLDAUser(user)) return true
    return false
  },

  // Form permissions
  canCreateNewApplication: (user: User): boolean => {
    if (permissions.isSuperUser(user)) return true
    if (permissions.isLDAUser(user)) return true // LDA Users can create new applications (DFT and FRIS only)
    return false
  },

  canViewDashboardStats: (user: User): boolean => {
    if (permissions.isSuperUser(user)) return true
    if (permissions.isAdmin(user)) return true
    if (permissions.isProgrammeOfficer(user)) return true
    if (permissions.isLDAUser(user)) return true // LDA users can access their own dashboard stats
    return false
  },

  // UI Component permissions
  showManageLDAButton: (user: User, lda?: LDA): boolean => {
    if (permissions.isSuperUser(user)) return true
    if (permissions.isProgrammeOfficer(user) && lda) {
      return lda.programmeOfficerId === user.id // POs can manage their LDAs
    }
    return false // Remove Manage LDA button for LDA Users and Admins
  }
}

// Helper function to get user role display name
export const getRoleDisplayName = (role: Role): string => {
  switch (role) {
    case 'SUPER_USER':
      return 'Super User'
    case 'ADMIN':
      return 'Admin'
    case 'PROGRAMME_OFFICER':
      return 'Programme Officer'
    case 'USER':
      return LDA_TERMINOLOGY.userRole
    default:
      return 'Unknown'
  }
}

// Helper function to get available roles for user creation
export const getAvailableRolesForCreation = (currentUser: User): Role[] => {
  if (permissions.isSuperUser(currentUser)) {
    return ['SUPER_USER', 'ADMIN', 'PROGRAMME_OFFICER', 'USER']
  }
  if (permissions.isAdmin(currentUser)) {
    return ['PROGRAMME_OFFICER', 'USER']
  }
  return []
}

export const canViewFunders = (user: User | null): boolean => {
  if (!user) return false
  if (permissions.isSuperUser(user)) return true
  if (permissions.isAdmin(user)) return true
  if (permissions.isProgrammeOfficer(user)) return true
  if (permissions.isLDAUser(user)) return false
  return false
}

export const canViewFunds = (user: User | null): boolean => {
  if (!user) return false
  if (permissions.isSuperUser(user)) return true
  if (permissions.isAdmin(user)) return true
  if (permissions.isProgrammeOfficer(user)) return true
  if (permissions.isLDAUser(user)) return false
  return false
}

export const canManageFund = (user: User | null): boolean => {
  if (!user) return false
  if (permissions.isSuperUser(user)) return true
  if (permissions.isAdmin(user)) return true
  if (permissions.isProgrammeOfficer(user)) return true
  if (permissions.isLDAUser(user)) return false
  return false
}

export const canManageFunder = (user: User | null): boolean => {
  if (!user) return false
  if (permissions.isSuperUser(user)) return true
  if (permissions.isAdmin(user)) return true
  if (permissions.isProgrammeOfficer(user)) return true
  if (permissions.isLDAUser(user)) return false
  return false
}
