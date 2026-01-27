/**
 * Mock for curseforge-api module
 * Provides mocked CurseForge client for testing
 */

const mockSearchMods = jest.fn();
const mockGetMod = jest.fn();
const mockGetCategories = jest.fn();
const mockGetModFile = jest.fn();

const CurseForgeClient = jest.fn().mockImplementation(() => ({
  searchMods: mockSearchMods,
  getMod: mockGetMod,
  getCategories: mockGetCategories,
  getModFile: mockGetModFile,
}));

// Reset function to clear all mocks
CurseForgeClient.mockReset = () => {
  mockSearchMods.mockReset();
  mockGetMod.mockReset();
  mockGetCategories.mockReset();
  mockGetModFile.mockReset();
};

// Expose mock functions for test access
CurseForgeClient.mockSearchMods = mockSearchMods;
CurseForgeClient.mockGetMod = mockGetMod;
CurseForgeClient.mockGetCategories = mockGetCategories;
CurseForgeClient.mockGetModFile = mockGetModFile;

const CurseForgeGameEnum = {
  TheSims4: 78062,
  SIMS_4: 78062,
};

const CurseForgeModsSearchSortField = {
  Popularity: 2,
  TotalDownloads: 6,
  LastUpdated: 3,
  Name: 1,
};

const CurseForgeSortOrder = {
  Ascending: 'asc',
  Descending: 'desc',
};

module.exports = {
  CurseForgeClient,
  CurseForgeGameEnum,
  CurseForgeModsSearchSortField,
  CurseForgeSortOrder,
};
