import {
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarExport,
  GridToolbarQuickFilter,
  GridToolbarDensitySelector,
} from "@mui/x-data-grid";

export default function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarQuickFilter />
      <GridToolbarFilterButton />
      <GridToolbarExport />
      <GridToolbarDensitySelector />
    </GridToolbarContainer>
  );
}
