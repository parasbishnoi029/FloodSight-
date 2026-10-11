"""
FloodSight AI — U-Net with ResNet-34 Encoder Backbone
Architecture for Pixel-Level Satellite Flood Segmentation.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models

class DoubleConv(nn.Module):
    """(Convolution => BatchNorm => ReLU) * 2"""
    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.double_conv = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.double_conv(x)

class DecoderBlock(nn.Module):
    """Upsampling followed by DoubleConv with skip connections"""
    def __init__(self, in_channels: int, skip_channels: int, out_channels: int):
        super().__init__()
        self.up = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=True)
        self.conv = DoubleConv(in_channels + skip_channels, out_channels)

    def forward(self, x: torch.Tensor, skip: torch.Tensor) -> torch.Tensor:
        x = self.up(x)
        # Pad if shapes mismatch slightly
        diff_y = skip.size()[2] - x.size()[2]
        diff_x = skip.size()[3] - x.size()[3]
        if diff_y > 0 or diff_x > 0:
            x = F.pad(x, [diff_x // 2, diff_x - diff_x // 2, diff_y // 2, diff_y - diff_y // 2])
        x = torch.cat([skip, x], dim=1)
        return self.conv(x)

class FloodSightUNetResNet34(nn.Module):
    """
    U-Net architecture with ResNet-34 encoder for satellite flood segmentation.
    Input: (B, 3, H, W) optical satellite image
    Output: (B, 1, H, W) raw unthresholded logits
    """
    def __init__(self, in_channels: int = 3, num_classes: int = 1, pretrained: bool = True):
        super().__init__()
        # Load torchvision ResNet-34
        resnet = models.resnet34(weights=models.ResNet34_Weights.DEFAULT if pretrained else None)

        # Adapt first convolution if channel count differs from 3
        if in_channels != 3:
            self.first_conv = nn.Conv2d(in_channels, 64, kernel_size=7, stride=2, padding=3, bias=False)
        else:
            self.first_conv = resnet.conv1

        self.bn1 = resnet.bn1
        self.relu = resnet.relu
        self.maxpool = resnet.maxpool

        # Encoder Layers (ResNet-34 stages)
        self.encoder1 = resnet.layer1  # (B, 64, H/4, W/4)
        self.encoder2 = resnet.layer2  # (B, 128, H/8, W/8)
        self.encoder3 = resnet.layer3  # (B, 256, H/16, W/16)
        self.encoder4 = resnet.layer4  # (B, 512, H/32, W/32)

        # Center / Bottleneck
        self.bottleneck = DoubleConv(512, 512)

        # Decoder Layers with Skip Connections
        self.dec4 = DecoderBlock(in_channels=512, skip_channels=256, out_channels=256)
        self.dec3 = DecoderBlock(in_channels=256, skip_channels=128, out_channels=128)
        self.dec2 = DecoderBlock(in_channels=128, skip_channels=64, out_channels=64)
        self.dec1 = DecoderBlock(in_channels=64, skip_channels=64, out_channels=32)

        # Final Upsampling to full resolution & 1x1 Conv
        self.final_up = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=True)
        self.final_conv = nn.Sequential(
            DoubleConv(32, 16),
            nn.Conv2d(16, num_classes, kernel_size=1)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Encoder stem
        x0 = self.first_conv(x)
        x0 = self.bn1(x0)
        x0 = self.relu(x0)            # (B, 64, H/2, W/2)
        x1 = self.maxpool(x0)         # (B, 64, H/4, W/4)

        # Encoder stages
        e1 = self.encoder1(x1)         # (B, 64, H/4, W/4)
        e2 = self.encoder2(e1)         # (B, 128, H/8, W/8)
        e3 = self.encoder3(e2)         # (B, 256, H/16, W/16)
        e4 = self.encoder4(e3)         # (B, 512, H/32, W/32)

        # Bottleneck
        b = self.bottleneck(e4)        # (B, 512, H/32, W/32)

        # Decoder stages
        d4 = self.dec4(b, e3)          # (B, 256, H/16, W/16)
        d3 = self.dec3(d4, e2)         # (B, 128, H/8, W/8)
        d2 = self.dec2(d3, e1)         # (B, 64, H/4, W/4)
        d1 = self.dec1(d2, x0)         # (B, 32, H/2, W/2)

        out = self.final_up(d1)        # (B, 32, H, W)
        logits = self.final_conv(out)  # (B, 1, H, W)
        return logits
