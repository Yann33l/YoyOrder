import {
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridToolbarFilterButton,
  GridToolbarQuickFilter,
} from "@mui/x-data-grid";

export default function CustomToolBar() {
  return (
    <GridToolbarContainer>
      <GridToolbarQuickFilter />
      <GridToolbarFilterButton />
      <GridToolbarExport />
      <GridToolbarDensitySelector />
    </GridToolbarContainer>
  );
}
